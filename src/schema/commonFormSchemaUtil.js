import React from 'react';
import createClass from 'create-react-class';
import {
    Form,
    Input,
    Row,
    Col,
    DatePicker,
    Select,
    Icon,
    Radio,
    InputNumber,
    Checkbox,
    Cascader
} from 'antd';
import * as api from 'api';
import remoteDataUtil from './CommonFormRemoteDataUtil';

const FormItem = Form.Item;

// 暂存的JsxGenerator
const JsxGeneratorMap = new Map();
// 暂存表单组件, key是schema 的$id, value是对应的react组件
const FormMap = new Map();

//缓存uiSchema,uiSchema中存在需动态获取的数据,获取后更新uiSchema并缓存
const UiSchemaMap = new Map();

const SchemaUtils = {
    getForm(schema, uiSchema) {
        const id = schema["$id"];
        if (FormMap.has(id)) {
            return FormMap.get(id);
        } else {
            const newForm = this.createForm(id, schema, uiSchema);
            FormMap.set(id, newForm);
            return newForm;
        }
    },
    createForm(id, schema, uiSchema) {
        console.log("createCommonForm")
        const util = this;
        // 只能用传统的ES5的写法, 函数式(无状态)组件应该也可以, 但是需要生命周期相关方法
        const tmpComponent = createClass({
            getInitialState() {
                return {
                    inited: false
                };
            },
            componentWillMount() {
                console.log("tmpCommonForm componentWillMount");
                // 组件初始化时读取generator
                if (JsxGeneratorMap.has(id)) {
                    this.generateJsx = JsxGeneratorMap.get(id);
                    return;
                }
            },
            async componentDidMount() {
                if (UiSchemaMap.has(id)) {
                    //jsx结构已经构建并缓存
                    return;
                }

                util.mergeSchema(schema, uiSchema);

                await util.getRemoteData(id, uiSchema);

                UiSchemaMap.set(id, true);


                const generateJsx = util.parse(id, schema, uiSchema);

                JsxGeneratorMap.set(id, generateJsx);

                this.generateJsx = generateJsx;

                this.setState({
                    inited: true
                })

            },
            render() {
                console.log("tmpCommonForm render");
                let formData = this.props.formData;
                formData=formData||{}
                // getFieldDecorator一层层往下传递(高阶函数的使用)
                return this.generateJsx ? this.generateJsx(this.props.form.getFieldDecorator, formData) : null;
            },
        });
        // 注意要再用antd的create()方法包装下
        return Form.create()(tmpComponent);
    },
    mergeSchema(schema, uiSchema) {
        Object.keys(uiSchema).forEach(function (key) {
            let schemaProperty = schema["properties"][key];
            let uiSchemaProperty = uiSchema[key];
            uiSchemaProperty.key = key;
            if (uiSchemaProperty["ui:rules"] === undefined) {
                uiSchemaProperty["ui:rules"] = []
            }
            if (uiSchemaProperty["ui:formItemConfig"] === undefined) {
                uiSchemaProperty["ui:formItemConfig"] = {}
            }
            //merge description 
            if (uiSchemaProperty["ui:formItemConfig"]["extra"] === undefined) {
                uiSchemaProperty["ui:formItemConfig"]["extra"] = uiSchemaProperty["ui:description"]
            }
            if (uiSchemaProperty["ui:formItemConfig"]["extra"] === undefined) {
                uiSchemaProperty["ui:formItemConfig"]["extra"] = schemaProperty["description"];
            }
            //merge title
            if (uiSchemaProperty["ui:formItemConfig"]["label"] === undefined) {
                uiSchemaProperty["ui:formItemConfig"]["label"] = uiSchemaProperty["ui:title"]
            }
            if (uiSchemaProperty["ui:formItemConfig"]["label"] === undefined) {
                uiSchemaProperty["ui:formItemConfig"]["label"] = schemaProperty["title"];
            }
            //config labelCol 
            if (uiSchemaProperty["ui:formItemConfig"]["labelCol"] === undefined) {
                uiSchemaProperty["ui:formItemConfig"]["labelCol"] = { span: 8 };
            }
            //config wrapperCol 
            if (uiSchemaProperty["ui:formItemConfig"]["wrapperCol"] === undefined) {
                uiSchemaProperty["ui:formItemConfig"]["wrapperCol"] = { span: 16 };
            }

        })
    },
    async getRemoteData(id, uiSchema) {
        console.log("getRemoteData")
        const util = this;
        let calls = [];
        Object.keys(uiSchema).forEach(function (key) {
            let field = uiSchema[key];
            if (field["ui:remoteConfig"]) {
                switch (field["ui:widget"]) {
                    case 'select':
                        calls.push(util.getCascaderRemoteData(id, field));
                        break;
                    case 'radio':
                        calls.push(util.getCascaderRemoteData(id, field));
                        break;
                    case 'checkbox':
                        calls.push(util.getCascaderRemoteData(id, field));
                        break;
                    case 'multiSelect':
                        calls.push(util.getCascaderRemoteData(id, field));
                        break;
                    case 'between':
                        calls.push(util.getCascaderRemoteData(id, field));
                        break;
                    case 'cascader':
                        calls.push(util.getCascaderRemoteData(id, field));
                        break;
                    default:
                        calls.push(util.getCascaderRemoteData(id, field));
                }
            }
        });
        if (calls.length > 0) {
            await Promise.all([...calls]);
        }

    },
    parse(id, schema, uiSchema) {
        console.log("parse CommonForm schema")
        let items = [];
        let schemaProperties = schema["properties"];
        const util = this;
        Object.keys(uiSchema).forEach(function (key) {
            let field = uiSchema[key];
            const schemaProperty = schemaProperties[key];
            // 注意, 每个字段transform之后, 返回的也都是一个回调函数, 所以items其实是一个回调函数的集合
            switch (field["ui:widget"]) {
                case 'select':
                    items.push(util.transformNormal(field, schemaProperty));
                    break;
                case 'radio':
                    items.push(util.transformNormal(field, schemaProperty));
                    break;
                case 'checkbox':
                    items.push(util.transformNormal(field, schemaProperty));
                    break;
                case 'multiSelect':
                    items.push(util.transformNormal(field, schemaProperty));
                    break;
                case 'between':
                    items.push(util.transformNormal(field, schemaProperty));
                    break;
                case 'cascader':
                    items.push(util.transformCascader(field, schemaProperty));
                    break;
                default:
                    items.push(util.transformNormal(field, schemaProperty));
            }
        });

        return (getFieldDecorator, formData) => {
            const formItems = [];
            for (const item of items) {
                formItems.push(item(getFieldDecorator, formData));
            }
            return (<Form>
                {formItems}
            </Form>);
        };
    },
    getCascaderRemoteData(id, field) {
        const { apiKey, hand } = field["ui:remoteConfig"];
        return new Promise(function (resolve, reject) {
            api[apiKey]().then(res => {
                let data = res.data;
                data = field["ui:remoteConfig"]["hand"](data);
                field["ui:options"]["options"] = data;
                remoteDataUtil.addData(id + "_" + field.key, data)
                resolve(data);
            });
        });
    },
    transformNormal(field, schemaProperty) {
        switch (field["ui:widget"]) {
            case 'int':
                return this.formItemWrapper((getFieldDecorator, formData) => getFieldDecorator(field.key, { initialValue: formData[field.key] })(
                    <InputNumber size="default" max={field.max} min={field.min} placeholder={field.placeholder} />
                ), field);
            case 'float':
                return this.formItemWrapper((getFieldDecorator, formData) => getFieldDecorator(field.key, { initialValue: formData[field.key] })(
                    <InputNumber step={0.01} size="default" max={field.max} min={field.min} placeholder={field.placeholder} />
                ), field);
            case 'datetime':
                return this.formItemWrapper((getFieldDecorator, formData) => getFieldDecorator(field.key, { initialValue: formData[field.key] })(
                    <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" placeholder={field.placeholder || '请选择日期'} />
                ), field);
            case 'input.textarea':
                return this.formItemWrapper(
                    (getFieldDecorator, formData) =>
                        getFieldDecorator(field.key,
                            {
                                initialValue: formData[field.key],
                                rules: [...field["ui:rules"]]
                            })(<Input.TextArea {...field["ui:options"]} />),
                    field);
            default:  // 默认就是普通的输入框
                return this.formItemWrapper(
                    (getFieldDecorator, formData) =>
                        getFieldDecorator(field.key,
                            {
                                initialValue: formData[field.key],
                                rules: [...field["ui:rules"]]
                            })(<Input {...field["ui:options"]} />),
                    field);
        }
    },
    transformCascader(field, schemaProperty) {
        return this.formItemWrapper(
            (getFieldDecorator, formData) =>
                getFieldDecorator(field.key, {
                    initialValue: formData[field.key],
                    rules: [...field["ui:rules"]]
                })(<Cascader {...field["ui:options"]} />),//函数作为参数传递
            field);
    },
    formItemWrapper(formItem, field) {
        return (getFieldDecorator, formData) => (
            <FormItem key={field.key} {...field["ui:formItemConfig"]}>
                {formItem(getFieldDecorator, formData)}
            </FormItem>
        );
    }
}
export default SchemaUtils;