// Connects the FormBuilder with various sanity roles
import React, {PropTypes} from 'react'
import documentStore from 'datastore:@sanity/base/document'
import Spinner from 'component:@sanity/components/loading/spinner'
import FormBuilder from 'role:@sanity/form-builder'
import equals from 'shallow-equals'
import {unprefixType} from './utils/unprefixType'
import schema from 'schema:@sanity/base/schema'

const preventDefault = ev => ev.preventDefault()

function createFormBuilderStateFrom(serialized, typeName) {
  return serialized ? FormBuilder.deserialize(unprefixType(serialized), typeName) : FormBuilder.createEmpty(typeName)
}
const noop = () => {}

export default class EditorPane extends React.Component {
  static propTypes = {
    documentId: PropTypes.string,
    onCreated: PropTypes.func,
    onUpdated: PropTypes.func,
    typeName: PropTypes.string
  };
  static defaultProps = {
    onCreated: noop,
    onUpdated: noop,
  };

  constructor(props, ...rest) {
    super(props, ...rest)

    this.state = {
      value: FormBuilder.createEmpty(props.typeName),
      progress: null
    }

    this.handleChange = this.handleChange.bind(this)
    this.handleDocPatch = this.handleDocPatch.bind(this)
    this.subscriptions = []
  }

  setupSubscriptions(props) {
    this.tearDownSubscriptions()
    const {documentId, typeName} = props

    const byId = documentStore.byId(documentId)

    this.setState({
      value: FormBuilder.createEmpty(typeName)
    })

    const initialSubscription = byId
      .first(event => event.type === 'snapshot')
      .subscribe(event => {
        this.setState({
          value: createFormBuilderStateFrom(event.document, typeName)
        })
      })

    const updateSubscription = byId
      .filter(event => event.type === 'update')
      .subscribe(event => {
        this.handleDocPatch(event.patch)
      })

    this.subscriptions = [initialSubscription, updateSubscription]
  }

  tearDownSubscriptions() {
    this.subscriptions.forEach(sub => sub.unsubscribe())
  }

  componentWillMount() {
    this.setupSubscriptions(this.props)
  }

  componentWillUnmount() {
    this.tearDownSubscriptions()
  }

  shouldComponentUpdate(nextProps, nextState) {
    return !equals(this.props, nextProps) || !equals(this.state, nextState)
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.documentId !== this.props.documentId) {
      this.setupSubscriptions(nextProps)
    }
  }

  handleChange(event) {

    const id = this.state.value.getFieldValue('$id')

    if (id) {
      this.update(id, event.patch)
    } else {
      this.create(event.patch)
    }
  }

  update(id, patch) {
    this.setState({progress: 'Saving…'})
    return documentStore
      .update(id, patch)
      .subscribe(result => {
        this.setState({progress: null})
      })
  }

  create(patch) {
    if (this.creating) {
      return null
    }
    const {typeName, onCreated} = this.props
    const prefixedType = `${schema.name}.${typeName}`
    const nextValue = this.state.value.patch(patch)
    this.creating = true
    this.setState({progress: 'Creating…'})

    return documentStore
      .create(Object.assign(nextValue.serialize(), {$type: prefixedType}))
      .delay(1100) // Need to wait for document to actual exist in ES index
      .subscribe(result => {
        this.setState({progress: null})
        onCreated({id: result.documentId})
      })
  }

  handleDocPatch(patch) {
    const nextValue = this.state.value.patch(patch)
    this.setState({value: nextValue})
  }

  render() {
    const {value, progress, validation} = this.state

    return (
      <div className="content">
        <form className="form-container" onSubmit={preventDefault}>
          <div style={{float: 'right', top: 0, right: 5, height: '1rem'}}>
            {progress && (
              <div>
                <div style={{paddingRight: 5, display: 'inline-block'}}><Spinner /></div>
                {progress}
              </div>
            )}
          </div>
          <FormBuilder
            value={value}
            validation={validation}
            onChange={this.handleChange}
          />
        </form>
      </div>
    )
  }
}
