import {omit} from 'lodash'
import {versionedClient} from '../../../../client/versionedClient'
import {isLiveEditEnabled} from '../utils/isLiveEditEnabled'
import {OperationImpl} from './types'

type DisabledReason = 'LIVE_EDIT_ENABLED' | 'NOT_PUBLISHED'

export const unpublish: OperationImpl<[], DisabledReason> = {
  disabled: ({snapshots, typeName}) => {
    if (isLiveEditEnabled(typeName)) {
      return 'LIVE_EDIT_ENABLED'
    }
    return snapshots.published ? false : 'NOT_PUBLISHED'
  },
  execute: ({idPair, snapshots}) => {
    let tx = versionedClient.observable.transaction().delete(idPair.publishedId)

    if (snapshots.published) {
      tx = tx.createIfNotExists({
        ...omit(snapshots.published, '_updatedAt'),
        _id: idPair.draftId,
        _type: snapshots.published._type,
      })
    }

    return tx.commit({
      tag: 'document.unpublish',
      // this disables referential integrity for cross-dataset references. we
      // have this set because we warn against unpublishes in the `ConfirmDeleteDialog`
      // UI. This operation is run when "unpublish anyway" is clicked
      skipCrossDatasetReferenceValidation: true,
    })
  },
}
