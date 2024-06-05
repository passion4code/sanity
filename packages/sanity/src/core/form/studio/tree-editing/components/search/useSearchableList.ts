import {isEqual} from 'lodash'
import {useCallback, useEffect, useMemo, useState} from 'react'
import {map} from 'rxjs'
import {type Previewable, useDocumentPreviewStore} from 'sanity'

import {type TreeEditingMenuItem} from '../../types'
import {type SearchableTreeEditingMenuItem} from './types'
import {flattenItems} from './utils'

/**
 * A hook that takes a list of items and returns a flat list of
 * items that are searchable by adding the title to the item.
 */
export function useSearchableList(items: TreeEditingMenuItem[]): SearchableTreeEditingMenuItem[] {
  const [searchableList, setSearchableList] = useState<SearchableTreeEditingMenuItem[]>([])
  const {observeForPreview} = useDocumentPreviewStore()

  const flatList = useMemo(() => flattenItems(items), [items])

  const handleResult = useCallback(
    (item: SearchableTreeEditingMenuItem) => {
      const path = item.path

      setSearchableList((prev) => {
        const exists = prev.some((prevItem) => isEqual(prevItem.path, path))

        if (exists) {
          return prev.map((prevItem) => {
            if (isEqual(prevItem.path, path)) {
              return {
                ...item,
                title: item?.title,
              }
            }

            return prevItem
          })
        }

        return prev.concat(item)
      })
    },
    [setSearchableList],
  )

  useEffect(() => {
    flatList.forEach((item) => {
      const sub$ = observeForPreview(item.value as Previewable, item.schemaType).pipe(
        map((event) => {
          const searchableItem = {
            ...item,

            // Add the title to the item to make it searchable
            title: event.snapshot?.title,
          }

          return searchableItem as SearchableTreeEditingMenuItem
        }),
      )

      sub$.subscribe(handleResult).unsubscribe()
    })
  }, [flatList, handleResult, observeForPreview])

  return searchableList
}
