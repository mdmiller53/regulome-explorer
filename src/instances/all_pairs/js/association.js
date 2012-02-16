if (re.model === undefined) re.model = {};

re.model.association =  {
	types : [
		{ 	id : 'logged_pvalue',
			label : 'log10(p)',
			ui : {
			filter : {
				 					component: {
					 							xtype : 'numberfield',
                                                id:'logged_pvalue',
                                                name :'logged_pvalue',
                                                allowNegative: true,
                                                decimalPrecision : 0,
                                                emptyText : 'Input value...',
                                                invalidText:'This value is not valid.',
                                                maxValue:0,
                                                minValue:-300.0,
                                                tabIndex : 1,
                                                validateOnBlur : true,
                                                fieldLabel : 'log10(p) <=',
                                                defaultValue: -2,
                                                value : -2
                                            }
			},
			grid : {
				column : { header : "log10(p)", width : 50 , id: 'logged_pvalue' , dataIndex : 'logged_pvalue', hidden: true},
				store_index : 'logged_pvalue'
			}
			},
			query : {
				id : 'logged_pvalue',
				clause : 'logged_pvalue <= ',
				order_direction : 'ASC'
			},
			vis : {
				network : {
					edgeSchema : {name: "logged_pvalue", type: "number" }
				},
				tooltip : {
					entry : { 'log(p)' : 'logged_pvalue' }
				},
                scatterplot: {
                    values: {
                        min:-300,
                        floor : -50,
                        ceil: 0
                    }
                }
			}
		},
		{ 	id : 'num_nonna',
			label : '# of non-NA',
			ui : {
			filter : {
				 					component: {
					 							xtype : 'numberfield',
                                                id:'num_nonna',
                                                name :'num_nonna',
                                                allowNegative: false,
                                                decimalPrecision : 2,
                                                emptyText : 'Input value...',
                                                invalidText:'This value is not valid.',
                                                minValue:0,
                                                tabIndex : 1,
                                                validateOnBlur : true,
                                                fieldLabel : '# of non-NA >=',
                                                defaultValue: 0,
                                                value : 0
                                           }
			},
			grid : {
				column : { header: "# of non-NA", width:50, id:'num_nonna',dataIndex:'num_nonna' },
				store_index : 'num_nonna'
				}
			},
			query : {
				id : 'num_nonna',
				clause : 'num_nonna >= ',
				order_direction : 'DESC'
			},
			vis : {
				network : {
					edgeSchema : { name: "num_nonna", type: "number" }
				},
				tooltip : {
					entry : { ' # of non-NA' : 'num_nonna'}
				},
                scatterplot: {}
			}
		},
		{ 	id : 'correlation',
			label : 'Correlation',
			ui : {
			filter : {
				 					component:   new re.multirangeField(
                                                {   id:'correlation',
                                                    label: 'Correlation',
                                                    default_value: 0,
                                                    min_value: -1,
                                                    max_value: 1}
                                            )
			},
			grid : {
				column : { header: "Correlation", width:50, id:'correlation',dataIndex:'correlation'},
				store_index : 'correlation'
				}
			},
			query : {
				id : 'correlation',
				clause : flex_field_query,
				order_direction : 'DESC'
			},
			vis : {
				network : {
					edgeSchema : { name: "correlation", type: "number" }
				},
				tooltip : {
					entry : {  Correlation : 'correlation'}
				},
                scatterplot: {}
			}
		}
	]
};

re.model.association_map = pv.numerate(re.model.association.types, function(obj) { return obj.id;});