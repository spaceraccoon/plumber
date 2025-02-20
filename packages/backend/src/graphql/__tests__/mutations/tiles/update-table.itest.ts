import { randomUUID } from 'crypto'
import { beforeEach, describe, expect, it } from 'vitest'

import updateTable from '@/graphql/mutations/tiles/update-table'
import TableMetadata from '@/models/table-metadata'
import Context from '@/types/express/context'

import {
  generateMockContext,
  generateMockTable,
  generateMockTableColumns,
} from './table.mock'

describe('update table mutation', () => {
  let context: Context
  let dummyTable: TableMetadata
  let dummyColumnId: string

  // cant use before all here since the data is re-seeded each time
  beforeEach(async () => {
    context = await generateMockContext()

    dummyTable = await generateMockTable({ userId: context.currentUser.id })

    dummyColumnId = (
      await generateMockTableColumns({
        tableId: dummyTable.id,
        numColumns: 1,
      })
    )[0]
  })

  describe('table name changes', () => {
    it('is able to update table name', async () => {
      const newTableName = 'New Table Name'
      const updatedTable = await updateTable(
        null,
        {
          input: {
            id: dummyTable.id,
            name: newTableName,
            addedColumns: [],
            modifiedColumns: [],
            deletedColumns: [],
          },
        },
        context,
      )
      expect(updatedTable.name).toBe(newTableName)
    })

    it('will not amend table name if undefined', async () => {
      const updatedTable = await updateTable(
        null,
        {
          input: {
            id: dummyTable.id,
            addedColumns: [],
            modifiedColumns: [],
            deletedColumns: [],
          },
        },
        context,
      )
      expect(updatedTable.name).toBe('Test Table')
    })
  })

  describe('adding columns to table', () => {
    it('should add columns to table with correct positions', async () => {
      const updatedTable = await updateTable(
        null,
        {
          input: {
            id: dummyTable.id,
            addedColumns: ['New Column 1', 'New Column 2'],
            modifiedColumns: [],
            deletedColumns: [],
          },
        },
        context,
      )
      const columns = await updatedTable
        .$relatedQuery('columns')
        .select('position')
        .orderBy('position')
      expect(columns.length).toBe(3)
      expect(columns.map((c) => c.position)).toEqual([0, 1, 2])
    })

    it('should add columns to table with same name', async () => {
      const updatedTable = await updateTable(
        null,
        {
          input: {
            id: dummyTable.id,
            addedColumns: ['New Column 1', 'New Column 1', 'New Column 1'],
            modifiedColumns: [],
            deletedColumns: [],
          },
        },
        context,
      )
      const tableColumnCount = await updatedTable
        .$relatedQuery('columns')
        .resultSize()
      expect(tableColumnCount).toBe(4)
    })
  })

  describe('modify columns in table', () => {
    it('should modify column name', async () => {
      const updatedTable = await updateTable(
        null,
        {
          input: {
            id: dummyTable.id,
            addedColumns: [],
            modifiedColumns: [
              {
                id: dummyColumnId,
                name: 'New Column Name',
              },
            ],
            deletedColumns: [],
          },
        },
        context,
      )
      expect(updatedTable.columns[0].name).toBe('New Column Name')
    })

    it('should modify column widths', async () => {
      const updatedTable = await updateTable(
        null,
        {
          input: {
            id: dummyTable.id,
            addedColumns: [],
            modifiedColumns: [
              {
                id: dummyColumnId,
                name: 'New Column Name',
                config: {
                  width: 100,
                },
              },
            ],
            deletedColumns: [],
          },
        },
        context,
      )
      expect(updatedTable.columns[0].config.width).toBe(100)
    })

    it('should fail if column does not exist', async () => {
      const updateTableAction = updateTable(
        null,
        {
          input: {
            id: dummyTable.id,
            addedColumns: [],
            modifiedColumns: [
              {
                id: randomUUID(),
                name: 'New Column Name',
              },
            ],
            deletedColumns: [],
          },
        },
        context,
      )

      await expect(updateTableAction).rejects.toThrow()
    })
  })

  describe('delete columns in table', () => {
    it('should delete columns', async () => {
      // add more columns for deletion
      const updatedTable = await updateTable(
        null,
        {
          input: {
            id: dummyTable.id,
            addedColumns: ['New Column 1', 'New Column 2'],
            modifiedColumns: [],
          },
        },
        context,
      )

      await updateTable(
        null,
        {
          input: {
            id: dummyTable.id,
            addedColumns: [],
            modifiedColumns: [],
            deletedColumns: [
              updatedTable.columns[0].id,
              updatedTable.columns[1].id,
            ],
          },
        },
        context,
      )
      const tableColumnCount = await dummyTable
        .$relatedQuery('columns')
        .resultSize()
      expect(tableColumnCount).toBe(1)
    })
    it('should not delete last column', async () => {
      await expect(() =>
        updateTable(
          null,
          {
            input: {
              id: dummyTable.id,
              addedColumns: [],
              modifiedColumns: [],
              deletedColumns: [dummyColumnId],
            },
          },
          context,
        ),
      ).rejects.toThrowError()
    })

    it('should not be able to delete a column from a different table', async () => {
      // add more columns for deletion
      await updateTable(
        null,
        {
          input: {
            id: dummyTable.id,
            addedColumns: ['New Column 1', 'New Column 2'],
            modifiedColumns: [],
          },
        },
        context,
      )

      const dummyTable2 = await context.currentUser
        .$relatedQuery('tables')
        .insertGraph({
          name: 'Test Table',
          role: 'owner',
        })

      const dummmyColumn2 = await dummyTable2.$relatedQuery('columns').insert({
        name: 'Test Column',
      })
      await updateTable(
        null,
        {
          input: {
            id: dummyTable.id,
            addedColumns: [],
            modifiedColumns: [],
            deletedColumns: [dummmyColumn2.id],
          },
        },
        context,
      )
      const tableColumnCount = await dummyTable2
        .$relatedQuery('columns')
        .resultSize()
      expect(tableColumnCount).toBe(1)
    })
  })
})
