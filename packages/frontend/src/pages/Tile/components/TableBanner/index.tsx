import { Flex, Text } from '@chakra-ui/react'

import { TABLE_BANNER_HEIGHT } from '../../constants'
import { useTableContext } from '../../contexts/TableContext'

import BreadCrumb from './BreadCrumb'
import EditMode from './EditMode'
import ImportExportToolbar from './ImportExportToolbar'

function TableBanner() {
  const { tableName, hasEditPermission } = useTableContext()

  return (
    <Flex
      px={8}
      h={TABLE_BANNER_HEIGHT}
      alignItems="center"
      justifyContent="space-between"
      overflow="hidden"
      zIndex={10}
    >
      <Flex alignItems="center" gap={4}>
        {hasEditPermission ? (
          <BreadCrumb />
        ) : (
          <Text textStyle="subhead-1">{tableName}</Text>
        )}
        <EditMode />
      </Flex>
      <ImportExportToolbar />
    </Flex>
  )
}

export default TableBanner
