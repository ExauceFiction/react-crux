import autobind from "autobind-decorator"
import * as React from "react"
import { InlineComponentProps } from "../CruxComponent"
import { FetchUtil } from "../FetchUtil"
import { AsyncTypeahead } from "react-bootstrap-typeahead"
import * as _ from "lodash"
import { fetchDynamicTypeaheadResults } from "../Actions"

@autobind
export class DynamicTypeaheadComponent extends React.Component<InlineComponentProps, any> {

    constructor(props: any) {
        super(props)
        this.state = {
            isLoading: false,
            options: [],
            selected: props.currentModel || undefined
        }
    }

    componentDidMount() {
        if (this.props.field.foreign) {
            const options = this.props.additionalModels[this.props.field.foreign.modelName]
            if (options) {
                const finalOptions = options.results || options
                if (!_.isEmpty(this.state.selected)) {
                    const selectedRecordExist = finalOptions.find((data: any) => data[this.props.field.foreign.key] === this.state.selected)
                    if (selectedRecordExist) {
                        this.setState({
                            isLoading: false,
                            options: finalOptions
                        })
                    } else {
                        this.fetchResults(finalOptions)
                    }
                } else {
                    this.setState({
                        isLoading: false,
                        options: finalOptions
                    })
                }
            } else {
                this.fetchResults()
            }
        } else {
            console.error("Did you forget to add a \"foreign\" field with a type: \"dynamictypeahead\". Possible culprit: ", this.props.field)
        }
    }

    fetchResults = (options?: any) => {
        const item: any = {
            limit: 10
        }
        if (!_.isEmpty(this.state.selected)) {
            if (this.props.field.foreign.keys) {
                for (const key of this.props.field.foreign.keys) {
                    item[key] = this.state.selected[key]
                }
            } else {
                item[this.props.field.foreign.key] = this.state.selected
            }
        }
        fetchDynamicTypeaheadResults(this.props.field.foreign.modelName, item).then((data: any) => {
            let dataResults: any = data.results
            if (options) {
                dataResults = _.uniq(options.concat(data.results))
            }
            this.setState({
                isLoading: false,
                options: dataResults,
            })
        }).catch((error: any) => {
            console.log("Error while fetching " + this.props.field.foreign.modelName, error)
        })
    }

    handleSearch = (query: string) => {
        this.setState({ isLoading: true })
        const item = {
            [this.props.field.foreign.title]: query, limit: 10
        }
        fetchDynamicTypeaheadResults(this.props.field.foreign.modelName, item).then((data: any) => {
            let dataResults: any = data.results
            if (_.isEmpty(this.state.options)) {
                dataResults = _.uniq(data.results.concat(this.state.options))
            }
            this.setState({
                isLoading: false,
                options: dataResults,
            })
        }).catch((error: any) => {
            console.log("Error while fetching " + this.props.field.foreign.modelName, error)
        })
    }

    handleChange = (item: any) => {
        if (!_.isEmpty(item)) {
            this.setState({ selected: item[0].value })
            this.props.modelChanged(this.props.field, item[0].value)
        } else {
            this.setState({ selected: undefined })
        }
    }

    handleBlurChange = () => {
        if (_.isEmpty(this.state.selected) && !_.isEmpty(this.props.currentModel)) {
            this.props.modelChanged(this.props.field, "")
        }
    }

    getModalValue = (modelData: any) => {
        if (this.props.field.foreign.keys && Array.isArray(this.props.field.foreign.keys)) {
            const eventKey: any = {}
            for (const key of this.props.field.foreign.keys) {
                eventKey[key] = modelData[key]
            }
            return eventKey
        }
        return modelData[this.props.field.foreign.key]
    }

    getTitle = (modelData: any) => {
        return this.props.field.foreign.titleTransform ? this.props.field.foreign.titleTransform(modelData) : modelData[this.props.field.foreign.title]
    }

    render() {
        let selected = undefined
        let optionsData: any = []
        if (this.state.options.length) {
            optionsData = this.state.options.map((modelData: any) => {
                return { label: this.getTitle(modelData), value: this.getModalValue(modelData) }
            })
        }
        if (this.state.selected) {
            const selectedRecord = _.find(optionsData, (doc: any) => {
                if (this.props.field.foreign.keys) {
                    return this.props.field.foreign.keys.every((key: any) => doc.value[key] === this.props.currentModel[key])
                }
                return doc.value === this.props.currentModel
            })
            selected = selectedRecord ? [selectedRecord] : undefined
        }
        return <div style={{ marginBottom: "10px" }}>
            <div style={{ display: "inline-block", width: "300px" }}>
                {
                    this.props.showTitle && !_.isEmpty(this.props.field.title) && !(this.props.field.style && this.props.field.style.hideLabel) &&
                    <div><label style={{
                        fontSize: "10px",
                        marginRight: "10px"
                    }}>{this.props.field.title.toUpperCase()}</label><br /></div>
                }
                <AsyncTypeahead
                    labelKey={"label"}
                    minLength={0}
                    isLoading={this.state.isLoading}
                    onSearch={this.handleSearch}
                    options={optionsData}
                    selected={selected || []}
                    onChange={this.handleChange}
                    onBlur={this.handleBlurChange}
                />
            </div>
        </div>
    }
}