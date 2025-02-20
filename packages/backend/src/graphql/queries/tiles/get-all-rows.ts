import { NotFoundError } from 'objection'

import InvalidTileViewKeyError from '@/errors/invalid-tile-view-key'
import { getTableRows, TableRowItem } from '@/models/dynamodb/table-row'
import TableMetadata from '@/models/table-metadata'
import Context from '@/types/express/context'

type Params = {
  tableId: string
}

const getAllRows = async (
  _parent: unknown,
  params: Params,
  context: Context,
): Promise<Pick<TableRowItem, 'rowId' | 'data'>[]> => {
  const { tableId } = params

  try {
    const table = context.tilesViewKey
      ? await TableMetadata.query()
          .withGraphFetched('columns')
          .findOne({
            id: tableId,
            view_only_key: context.tilesViewKey,
          })
          .throwIfNotFound()
      : await context.currentUser
          .$relatedQuery('tables')
          .withGraphFetched('columns')
          .findById(tableId)
          .throwIfNotFound()

    // update last accessed at for collaborator/table
    if (!context.tilesViewKey) {
      await table.$relatedQuery('collaborators').patch({
        lastAccessedAt: new Date().toISOString(),
      })
    }

    const columnIds = table.columns.map((column) => column.id)
    return getTableRows({ tableId, columnIds })
  } catch (e) {
    if (e instanceof NotFoundError) {
      if (context.tilesViewKey) {
        throw new InvalidTileViewKeyError(tableId, context.tilesViewKey)
      }
      throw new Error('Table not found')
    }
    throw new Error('Error fetching rows')
  }
}

export default getAllRows
