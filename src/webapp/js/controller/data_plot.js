
function registerPlotListeners() {

    var d = vq.events.Dispatcher;
    d.addListener('data_ready','associations',function(data) {
        if (re.state.query_cancel) { return;}
        generateColorScale();
        renderCircleData(data);
        renderCircleLegend('top-right');
    });
    d.addListener('data_ready','sf_associations',function(data) {
        if (re.state.query_cancel) { return;}
        generateColorScale();
        renderSFCircleData(data);
        renderCircleLegend('center');
    });
    d.addListener( 'data_ready','graph',function(data) {
        var obj = {
            network : data,
            div : 'graph-panel'
        };
        initializeGraph(obj);
        var e = new vq.events.Event('graph_ready','graph',{});
            e.dispatch();
    });
    d.addListener( 'frame_ready','graph',function() {
        if (!re.display_options.cytoscape.ready) {
            renderGraph();
        }
    });
    d.addListener('data_ready','dataset_labels',function(obj){
        generateColorMaps(obj);
    });
    d.addListener('data_ready','annotations',function(obj){
        re.plot.chrome_length = obj['chrom_leng'];
    });
    d.addListener('render_scatterplot','details', function(obj){
        scatterplot_draw(obj);
    });
    d.addListener('render_linearbrowser', function(obj){
        renderLinearData(obj);
        renderLinearLegend();
    });
    d.addListener('render_complete','circvis', function(obj){
        re.circvis_obj = obj;
    });
    d.addListener('render_complete','graph', function(obj){
        //re.cytoscape.obj = obj.graph;
    });
    d.addListener('modify_circvis', function(obj){
        modifyCircle(obj);
    });
    d.addListener('layout_network', function(obj){
        if (re.display_options.cytoscape.ready) {
            layoutGraph();
        }
    });

}

function layoutGraph() {
    re.cytoscape.obj.layout(getNetworkLayout());
}

function getNetworkLayout() {
    var layout =  {name : "ForceDirected", options  : {gravitation : -500,mass: 3,
        tension: .01,drag:0.1,maxDistance:10000, minDistance: 1,
        iterations:200, autoStabilize: true, maxTime: 3000, restLength: 30}};

    switch(re.display_options.cytoscape.layout) {
        case('tree'):
            layout = {name : 'Tree',
                options:{
                    orientation: "topToBottom",
                    depthSpace: 50,
                    breadthSpace: 30,
                    subtreeSpace: 5
                }};
            break;
        case('radial'):
            layout = {name : 'Radial',
                options:{
                    angleWidth: 360,
                    radius: 150
                }};
            break;
        case('force_directed'):
        default:
            layout =  {name : "ForceDirected", options  : {gravitation : -500,mass: 3,
                tension: .01,drag:0.1,maxDistance:10000, minDistance: 1,
                iterations:200, autoStabilize: true, maxTime: 3000, restLength: 30}};
            break;
    }

    return layout;
}

function modifyCircle(object) {
    if (object.pan_enable != null) {
        re.circvis_obj.setPanEnabled(object.pan_enable);
    }
    if (object.zoom_enable  != null) {
        re.circvis_obj.setZoomEnabled(object.zoom_enable);
    }
}

function generateColorScale() {
    var pairwise_settings = re.display_options.circvis.rings.pairwise_scores;
    var field = re.display_options.circvis.rings.pairwise_scores.value_field;
        var association  = re.model.association.types[re.model.association_map[field]];
        var settings = association.vis.scatterplot;
        pairwise_settings.color_scale = pv.Scale.linear(settings.color_scale.domain());
        pairwise_settings.color_scale.range.apply(pairwise_settings.color_scale,settings.color_scale.range());

        if (pairwise_settings.manual_y_values) {
            var min = pairwise_settings.min_y_value;
            var max = pairwise_settings.max_y_value;
            pairwise_settings.color_scale.domain(min,max);
        }

        if (pairwise_settings.manual_y_color_scale) { pairwise_settings.color_scale.range(pairwise_settings.min_y_color,pairwise_settings.max_y_color);}


}

function generateColorMaps(dataset_labels) {
    var current_source_list = dataset_labels['feature_sources'].map(function(row) { return row.source;});
    var num_sources = current_source_list.length;
    re.plot.link_sources_array = [];
    current_source_list.forEach(function(row, index) {
        var color = re.plot.colors.link_type_colors(index);
        for (var i = 0; i < num_sources; i++) {
            re.plot.link_sources_array.push(color);
            color = color.darker(.3);
        }
    });
    var source_map = pv.numerate(dataset_labels['feature_sources'], function(row) {return row.source;});
    var current_data = re.plot.all_source_list.filter(function(input_row){return source_map[input_row] != undefined;});
    var current_map = pv.numerate(current_data);

    //re.plot.colors.node_colors = function(source) { return re.plot.colors.source_color_scale(current_map[source]);};
    re.plot.colors.link_sources_colors = function(link) { return re.plot.link_sources_array[current_map[link[0]] * current_data.length + current_map[link[1]]];}
}

function renderCircleLegend(anchor) {
    legend_draw(document.getElementById('circle-legend-panel'),anchor);
}
function renderLinearLegend(anchor) {
    legend_draw(document.getElementById('linear-legend-panel'));
}

function renderCircleData(data) {
    Ext.getCmp('circle-colorscale-panel').el.dom.innerHTML = '';
    buildNetworkCircvis(data, document.getElementById('circle-panel'));
}

function renderSFCircleData(data) {
    buildSFCircvis(data, document.getElementById('circle-panel'));
    var field = re.display_options.circvis.rings.pairwise_scores.value_field;
    var association  = re.model.association.types[re.model.association_map[field]];

    colorscale_draw( association,'circle-colorscale-panel');
}

function renderLinearData(obj) {
    linear_plot(vq.utils.VisUtils.extend(obj,{div:document.getElementById('linear-panel')}));
}

function renderGraph(data) {

    populateGraph();
}

function inter_chrom_click(node) {
    initiateDetailsPopup(node);
}

function initiateDetailsPopup(link) {
    var e =new vq.events.Event('click_association','vis',link);
    e.dispatch();
}



function colorscale_draw(association_obj, div) {
    var color_scale = re.display_options.circvis.rings.pairwise_scores.color_scale;

    var dom = color_scale.domain();
    var width = 240,
        scale_width = 160,
        box_width = 4,
        end = dom[dom.length-1],
        start = dom[0],
        step_size = end - start,
        steps = scale_width / box_width;
    var vis= new pv.Panel()
        .height(70)
        .width(width)
        .strokeStyle(null)
        .canvas(div);

    var x_axis = pv.Scale.linear(start,end).range(0,scale_width);
    var legend = vis.add(pv.Panel)
        .left((width-scale_width)/2)
        .right((width-scale_width)/2)
        .strokeStyle('black')
        .lineWidth(1)
        .bottom(30)
        .height(30);

    legend.add(pv.Bar)
            .data(pv.range(start,end,step_size/steps))
            .width(box_width)
            .left(function() { return this.index * box_width;})
            .fillStyle(color_scale);


    legend.add(pv.Rule)
        .data(x_axis.ticks(2))
        .left(x_axis)
        .strokeStyle('#000')
        .lineWidth(1)
        .anchor('bottom').add(pv.Label)
        .font('10px bold Courier, monospace')
        .text(x_axis.tickFormat);

    vis.anchor('bottom').add(pv.Label)
        .text(association_obj.label);

    vis.render();

}

function legend_draw(div,anchor) {

    var dataset_labels = re.ui.getDatasetLabels();
    var source_map = pv.numerate(dataset_labels['feature_sources'], function(row) {return row.source;});
    var current_locatable_data = re.plot.locatable_source_list.filter(function(input_row){return source_map[input_row] != undefined;});
    var current_data = re.plot.all_source_list.filter(function(input_row){return source_map[input_row] != undefined;});
    var current_map = pv.numerate(current_data);

    var anchor = anchor || 'top-right';
    var width=800, height=800;
    var legend_height = (30 + current_locatable_data.length * 13), legend_width = 150;
    var top = 20, left = 0;
    if (arguments[1] != undefined) {anchor = arguments[1];}
    switch(anchor) {
        case('center'):
            Ext.getCmp('circle-legend-panel').setPosition(375,330);
            Ext.getCmp('circle-legend-panel').doLayout();
            break;
        case('top-right'):
            Ext.getCmp('circle-legend-panel').setPosition(880,20);
            Ext.getCmp('circle-legend-panel').doLayout();
        default:
            break;
    }



    //re.plot.colors.node_colors = function(source) { return re.plot.colors.source_color_scale(current_map[source]);};
    re.plot.colors.link_sources_colors = function(link) { return re.plot.link_sources_array[current_map[link[0]] * current_data.length + current_map[link[1]]];}

    var vis= new pv.Panel()
        .left(left)
        .top(top)

        .width(legend_width)
        .height(legend_height)
        .lineWidth(1)
        .strokeStyle('black')
        .canvas(div);


    var drawPanel = vis.add(pv.Panel)
        .top(20)
        .left(0);

    drawPanel.add(pv.Label)
        .textAlign('left')
        .top(10)
        .left(12)
        .text('Features')
        .font("14px helvetica");

    var color_panel = drawPanel.add(pv.Panel)
        .left(10)
        .top(10);
    var entry =  color_panel.add(pv.Panel)
        .data(current_locatable_data)
        .top(function() { return this.index*12;})
        .height(12);
    entry.add(pv.Bar)
        .left(0)
        .width(12)
        .top(1)
        .bottom(1)
        .fillStyle(function(type) { return re.plot.colors.node_colors(type);});
    entry.add(pv.Label)
        .text(function(id) { return re.label_map[id] || id;})
        .bottom(0)
        .left(20)
        .textAlign('left')
        .textBaseline('bottom')
        .font("11px helvetica");

    vis.render();
}


function singlefeature_circvis(parsed_data,div) {
    var width=800, height=800;
    var ring_radius = width / 10;
    var chrom_keys = ["1","2","3","4","5","6","7","8","9","10",
        "11","12","13","14","15","16","17","18","19","20","21","22","X","Y"];
    var stroke_style = re.plot.colors.getStrokeStyleAttribute();

    function genome_listener(chr) {
        var e = new vq.events.Event('render_linearbrowser','circvis',{data:vq.utils.VisUtils.clone(parsed_data),chr:chr});
        e.dispatch();
    }

    function wedge_listener(feature) {
        var chr = feature.chr;
        var neighborhood = getFeatureNeighborhood(feature,2.5*re.MILLION);
        var start = neighborhood.start;
        var range_length = neighborhood.end - neighborhood.start;
        var e = new vq.events.Event('render_linearbrowser','circvis',{data:vq.utils.VisUtils.clone(parsed_data),chr:chr,start:start,range:range_length});
        e.dispatch();
    }

   var scatterplot_data = parsed_data['features'];

    var pairwise_settings = re.display_options.circvis.rings.pairwise_scores;
    var field = re.display_options.circvis.rings.pairwise_scores.value_field;
    var association  = re.model.association.types[re.model.association_map[field]];
    var settings = association.vis.scatterplot;

    if (settings.values === undefined) { settings.values = {};}
    var min = settings.values.min === undefined ? pv.min(scatterplot_data, function(o) { return o[field];}) : settings.values.min;
    var max = settings.values.max === undefined ? pv.max(scatterplot_data, function(o) { return o[field];}) : settings.values.max;
    var scale_type = settings.scale_type;

    if (pairwise_settings.manual_y_values) { min = pairwise_settings.min_y_value; max = pairwise_settings.max_y_value;}

    var chrom_leng = vq.utils.VisUtils.clone(re.plot.chrome_length);
    var ticks = vq.utils.VisUtils.clone(parsed_data['features']);

    //customize feature hovercard config to include association values
    var tooltips =  re.display_options.circvis.tooltips.feature;
    re.model.association.types.forEach(function(assoc) {
            vq.utils.VisUtils.extend(tooltips, assoc.vis.tooltip.entry);
       });

    var data = {
        GENOME: {
            DATA:{
                key_order : chrom_keys,
                key_length : chrom_leng
            },
            OPTIONS: {
                radial_grid_line_width: 1,
                label_layout_style : 'clock',
                listener : genome_listener,
                label_font_style : '18pt helvetica'
            }
        },
        TICKS : {
            DATA : {
                data_array : ticks
            },
            OPTIONS :{
                display_legend : false,
                listener : wedge_listener,
                stroke_style :stroke_style,
                fill_style : function(tick) {return re.plot.colors.node_colors(tick.source); },
                tooltip_items :  re.display_options.circvis.tooltips.feature,
                tooltip_links : re.display_options.circvis.tooltips.feature_links
            }
        },
        PLOT: {
            width : width,
            height :  height,
            horizontal_padding : 30,
            vertical_padding : 30,
            container : div,
            enable_pan : false,
            enable_zoom : false,
            show_legend: false,
            legend_include_genome : false,
            legend_corner : 'ne',
            legend_radius  : width / 15
        },
        WEDGE:[
            {
                PLOT : {
                    height : ring_radius/2,
                    type :   'karyotype'
                },
                DATA:{
                    data_array : cytoband
                },
                OPTIONS: {
                    legend_label : 'Cytogenetic Bands' ,
                    legend_description : 'Chromosomal Cytogenetic Bands',
                    outer_padding : 10,
                    tooltip_items : re.display_options.circvis.tooltips.karyotype_feature
                }
                        },{
                PLOT : {
                    height : ring_radius,
                    type :   'scatterplot'
                },
                DATA:{
                    data_array : scatterplot_data,
                    value_key : field
                },
                OPTIONS: {
                    legend_label : association.label ,
                    legend_description : association.label + ' Values',
                    outer_padding : 10,
                    base_value : (max - min) / 2,
                    min_value : min,
                    max_value : max,
                    radius : 2,
                    draw_axes : true,
                    shape:'dot',
                    fill_style  : function(feature) {return pairwise_settings.color_scale(feature[field]); },
                    stroke_style  : function(feature) {return pairwise_settings.color_scale(feature[field]); },
                    tooltip_items : tooltips,
                    tooltip_links : re.display_options.circvis.tooltips.feature_links
                    // listener : initiateDetailsPopup
                }
            }
        ]
    };
   return data;
}

function buildSFCircvis(parsed_data,div) {
    re.display_options.circvis.rings.pairwise_scores.hidden=false;
    var circle_vis = new vq.CircVis();
    var config = singlefeature_circvis(parsed_data,div);
        var obj = modifyCircvisObject(config);
        var dataObject ={DATATYPE : "vq.models.CircVisData", CONTENTS : obj };
        circle_vis.draw(dataObject);

        var e = new vq.events.Event('render_complete','circvis',circle_vis);
        e.dispatch();

        return circle_vis;
}


function wedge_plot(parsed_data,div) {
    var width=800, height=800;
    var ring_radius = width / 20;
    var chrom_keys = ["1","2","3","4","5","6","7","8","9","10",
        "11","12","13","14","15","16","17","18","19","20","21","22","X","Y"];
    var stroke_style = re.plot.colors.getStrokeStyleAttribute();

    function genome_listener(chr) {
        var e = new vq.events.Event('render_linearbrowser','circvis',{data:vq.utils.VisUtils.clone(parsed_data),chr:chr});
        e.dispatch();
    }

    function wedge_listener(feature) {
        var chr = feature.chr;
        var neighborhood = getFeatureNeighborhood(feature,2.5*re.MILLION);
                var start = neighborhood.start;
                var range_length = neighborhood.end - neighborhood.start;
        var e = new vq.events.Event('render_linearbrowser','circvis',{data:vq.utils.VisUtils.clone(parsed_data),chr:chr,start:start,range:range_length});
        e.dispatch();
    }

    var chrom_leng = vq.utils.VisUtils.clone(re.plot.chrome_length);
    var ticks = vq.utils.VisUtils.clone(parsed_data['features']);

    var types = re.model.association.types.map(function(assoc) { return assoc.query.id;});

    var unlocated_map = vq.utils.VisUtils.clone(parsed_data['unlocated']).filter(function(link) { return  link.node1.chr != '';})
        .map(function(link) {
            var node =  { chr:link.node1.chr, start:link.node1.start,end:link.node1.end, value: 0};
            node.sourceNode = vq.utils.VisUtils.extend({},link.node1); node.targetNode = vq.utils.VisUtils.extend({},link.node2);
            types.forEach(function(assoc) {
                node[assoc] = link[assoc];
            });
            return node;
        }).concat(vq.utils.VisUtils.clone(parsed_data['unlocated']).filter(function(link) { return  link.node2.chr != '';})
        .map(function(link) {
            var node =  { chr:link.node2.chr, start:link.node2.start,end:link.node2.end, value: 0};
            node.sourceNode = vq.utils.VisUtils.extend({},link.node1); node.targetNode = vq.utils.VisUtils.extend({},link.node2);
            types.forEach(function(assoc) {
                node[assoc] = link[assoc];
            });
            return node;
        }));

    var data = {
        GENOME: {
            DATA:{
                key_order : chrom_keys,
                key_length : chrom_leng
            },
            OPTIONS: {
                radial_grid_line_width: 1,
                label_layout_style : 'clock',
                listener : genome_listener,
                label_font_style : '18pt helvetica'
            }
        },
        TICKS : {
            DATA : {
                data_array : ticks
            },
            OPTIONS :{
                display_legend : false,
                listener : wedge_listener,
                stroke_style :stroke_style,
                fill_style : function(tick) {return re.plot.colors.node_colors(tick.source); },
              tooltip_links :re.display_options.circvis.tooltips.feature_links,
                    tooltip_items :  re.display_options.circvis.tooltips.feature     //optional
            }
        },
        PLOT: {
            width : width,
            height :  height,
            horizontal_padding : 30,
            vertical_padding : 30,
            container : div,
            enable_pan : false,
            enable_zoom : false,
            show_legend: true,
            legend_include_genome : true,
            legend_corner : 'ne',
            legend_radius  : width / 15
        },
        WEDGE:[
            {
                PLOT : {
                    height : ring_radius/2,
                    type :   'karyotype'
                },
                DATA:{
                    data_array : cytoband
                },
                OPTIONS: {
                    legend_label : 'Cytogenetic Bands' ,
                    legend_description : 'Chromosomal Cytogenetic Bands',
                    outer_padding : 10,
//                    fill_style : function(feature) { return feature.value;},
//                    stroke_style : function(feature) { return feature.value;},
                    tooltip_items : re.display_options.circvis.tooltips.karyotype_feature
//                    listener : wedge_listener
                }
            },{
                PLOT : {
                    height : ring_radius/2,
                    type :   'scatterplot'
                },
                DATA:{
                    data_array : unlocated_map
                },
                OPTIONS: {
                    legend_label : 'Unmapped Feature Correlates' ,
                    legend_description : 'Feature Correlates with No Genomic Position',
                    outer_padding : 10,
                    base_value : 0,
                    min_value : -1,
                    max_value : 1,
                    radius : 4,
                    draw_axes : false,
                    shape:'dot',
                    fill_style  : function(feature) {return re.plot.colors.link_sources_colors([feature.sourceNode.source,feature.targetNode.source]); },
                    //stroke_style  : function(feature) {return link_sources_colors([feature.sourceNode.source,feature.targetNode.source]); },
                    stroke_style : stroke_style,
                    tooltip_items : re.display_options.circvis.tooltips.unlocated_feature,
                    listener : initiateDetailsPopup
                }
            }
        ],

        NETWORK:{
            DATA:{
                data_array : parsed_data['network']
            },
            OPTIONS: {
                outer_padding : 15,
                node_highlight_mode : 'isolate',
                node_fill_style : 'ticks',
                node_stroke_style : stroke_style,
                link_line_width : 2,
                node_key : function(node) { return node['id'];},
                node_listener : wedge_listener,
                link_listener: initiateDetailsPopup,
                link_stroke_style : function(link) {
                    return re.plot.colors.link_sources_colors([link.sourceNode.source,link.targetNode.source]);},
                constant_link_alpha : 0.7,
                node_tooltip_items :   re.display_options.circvis.tooltips.feature,
                node_tooltip_links : re.display_options.circvis.tooltips.feature_links,
                
                link_tooltip_items :  re.display_options.circvis.tooltips.edge
            }
        }
    };
    return data;
}

function buildNetworkCircvis(data,div) {
    re.display_options.circvis.rings.pairwise_scores.hidden=true;
    var circle_vis = new vq.CircVis();
    var config = wedge_plot(data,div);
    var obj = modifyCircvisObject(config);
    var dataObject ={DATATYPE : "vq.models.CircVisData", CONTENTS : obj };
    circle_vis.draw(dataObject);

    var e = new vq.events.Event('render_complete','circvis',circle_vis);
    e.dispatch();

    return circle_vis;
}

function getFeatureNeighborhood(feature,window_size) {
    var f= vq.utils.VisUtils.clone(feature);
    f.start = f.start - window_size;
    f.end = (f.end || feature.start) + window_size;
    return f;
}

function linear_plot(obj) {
    var div = obj.div || null, parsed_data = obj.data || [], chrom = obj.chr || '1', start = obj.start || null, range_length = obj.range || null;
    var ucsc_genome_url = 'http://genome.ucsc.edu/cgi-bin/hgTracks';
    var tile_listener = function(feature){
        window.open(ucsc_genome_url + '?db=hg18&position=chr' + feature.chr + ':' + feature.start +
            '-'+ feature.end,'_blank');
        return false;
    };

    var located_tooltip_items = {
        Feature : function(tie) {
            return tie.label + ' ' + tie.source + ' Chr' +tie.chr + ' ' +
                tie.start + (tie.end != null ? '-'+tie.end : '')  + ' '+ tie.label_mod;}
    };
    var   inter_tooltip_items = { };
    inter_tooltip_items[re.ui.feature1.label] = function(tie) {
        return tie.sourceNode.label + ' ' + tie.sourceNode.source + ' Chr' +tie.sourceNode.chr + ' ' +tie.sourceNode.start +'-'+
            tie.sourceNode.end + ' ' + tie.sourceNode.label_mod;};
    inter_tooltip_items[re.ui.feature2.label] = function(tie) {
        return tie.targetNode.label + ' ' + tie.targetNode.source +
            ' Chr' + tie.targetNode.chr+ ' ' +tie.targetNode.start +'-'+tie.targetNode.end + ' ' + tie.targetNode.label_mod};


    var hit_map = parsed_data['unlocated'].filter(function(link) { return  link.node1.chr == chrom;})
        .map(function(link) {
            var obj = {};
            re.model.association.types.forEach(function(assoc) {
                obj[assoc.ui.grid.store_index] = link[assoc.query.id];
            });
            var node1_clone = vq.utils.VisUtils.extend(obj,link.node1);
            node1_clone.sourceNode = vq.utils.VisUtils.extend({},link.node1);
            node1_clone.targetNode = vq.utils.VisUtils.extend({},link.node2);
            return node1_clone;
        }).concat(parsed_data['unlocated'].filter(function(link) { return  link.node2.chr == chrom;})
        .map(function(link) {
            var obj = {};
            re.model.association.types.forEach(function(assoc) {
                obj[assoc.ui.grid.store_index] = link[assoc.query.id];
            });
            var node1_clone = vq.utils.VisUtils.extend(obj,link.node2);
            node1_clone.sourceNode = vq.utils.VisUtils.extend({},link.node1);
            node1_clone.targetNode = vq.utils.VisUtils.extend({},link.node2);
            return node1_clone;
        }));


    var tie_map = parsed_data['network'].filter(function(link) {
        return link.node1.chr == chrom && link.node2.chr == chrom &&
            Math.abs(link.node1.start - link.node2.start) > re.plot.proximal_distance;})
        .map(function(link) {
            var obj = {};
            re.model.association.types.forEach(function(assoc) {
                obj[assoc.ui.grid.store_index] = link[assoc.query.id];
            });
            var node1_clone = vq.utils.VisUtils.extend(obj,link.node1);
            node1_clone.start = link.node1.start <= link.node2.start ?
                link.node1.start : link.node2.start;
            node1_clone.end = link.node1.start <= link.node2.start ? link.node2.start : link.node1.start;
            node1_clone.start = node1_clone.start;node1_clone.end = node1_clone.end;
            node1_clone.sourceNode = vq.utils.VisUtils.extend({},link.node1);
            node1_clone.targetNode = vq.utils.VisUtils.extend({},link.node2);
            re.model.association.types.forEach(function(assoc) {
                node1_clone[assoc.ui.grid.store_index] = link[assoc.query.id];
            });
            return node1_clone;
        });

    var neighbor_map = parsed_data['network'].filter(function(link) {
        return link.node1.chr == chrom && link.node2.chr == chrom &&
            Math.abs(link.node1.start - link.node2.start) < re.plot.proximal_distance;})
        .map(function(link) {
            var obj = {};
            re.model.association.types.forEach(function(assoc) {
                obj[assoc.ui.grid.store_index] = link[assoc.query.id];
            });
            var node1_clone = vq.utils.VisUtils.extend(obj,link.node1);
            node1_clone.start = node1_clone.start;node1_clone.end = node1_clone.end;
            node1_clone.sourceNode = vq.utils.VisUtils.extend({},link.node1);
            node1_clone.targetNode = vq.utils.VisUtils.extend({},link.node2);
            return node1_clone;
        });

    var locations = vq.utils.VisUtils.clone(parsed_data['features']).filter(function(node) { return node.chr == chrom;})
        .map(function (location)  {
            return vq.utils.VisUtils.extend(location,{ start: location.start, end : location.end , label : location.value});
        });
    var node2_locations = parsed_data['network']
        .filter(function(link) {  return link.node2.chr == chrom;})
        .map(function(link) {
            return vq.utils.VisUtils.extend(link.node2, { start : link.node2.start, end: link.node2.end});
        });

    locations = locations.concat(node2_locations);

    var location_map = pv.numerate(locations,function(node) { return node.id+'';});

    locations = pv.permute(locations,pv.values(location_map));

    var data_obj = function() { return {
        PLOT :     {
            width:800,
            height:700,
            min_position:1,
            max_position:maxPos,
            vertical_padding:20,
            horizontal_padding:20,
            container : div,
            context_height: 100,
                            axes : {
                                x: {
                                    label : 'Chromosome ' + obj.chr + ' (Mb)',
                                    scale_multiplier : (1 / re.MILLION)
                                }
                            }},
        TRACKS : [
            { type: 'tile',
                label : 'Feature Locations',
                description : 'Genome Location of Features',
                CONFIGURATION: {
                    fill_style : function(node) { return re.plot.colors.node_colors(node.source);},          //required
                    stroke_style : function(node) { return re.plot.colors.node_colors(node.source);},          //required
                    track_height : 60,           //required
                    tile_height:10,                //required
                    track_padding: 20,             //required
                    tile_padding:5,              //required
                    tile_overlap_distance:1 * re.MILLION,
                    notifier:tile_listener,         //optional
                    track_fill_style : pv.color('#EEDEDD'),
                    track_line_width : 1,
                    track_stroke_style: pv.color('#000000')
                },
                OPTIONS: {
                   tooltip_links :re.display_options.circvis.tooltips.feature_links,
                    tooltip_items :  re.display_options.circvis.tooltips.feature     //optional
                },
                data_array : locations
            },  { type: 'glyph',
                label : 'Associations lacking Genomic Coordinates',
                description : '',
                CONFIGURATION: {
                    fill_style : function(hit) { return re.plot.colors.node_colors(hit.source);},
                    stroke_style : null,
                    track_height : 60,
                    track_padding: 20,
                    tile_padding:6,              //required
                    tile_overlap_distance:.1 * re.MILLION,    //required
                    shape :  'dot',
                    tile_show_all_tiles : true,
                    radius : 3,
                    track_fill_style : pv.color('#EEEEEE'),
                    track_line_width : 1,
                    track_stroke_style: pv.color('#000000'),
                    notifier:inter_chrom_click
                },
                OPTIONS: {
                    tooltip_items : re.display_options.circvis.tooltips.unlocated_feature
                },
                data_array : hit_map
            },
            { type: 'glyph',
                label : 'Proximal Feature Associations',
                description : '',
                CONFIGURATION: {
                    fill_style : function(link) { return re.plot.colors.link_sources_colors([link.sourceNode.source,link.targetNode.source])},
                    stroke_style : null,
                    track_height : 80,
                    track_padding: 20,
                    tile_padding:4,              //required
                    tile_overlap_distance:1 * re.MILLION,    //required
                    shape :  'dot',
                    tile_show_all_tiles : true,
                    radius : 3,
                    track_fill_style : pv.color('#DDEEEE'),
                    track_line_width : 1,
                    track_stroke_style: pv.color('#000000'),
                    notifier:inter_chrom_click
                },
                OPTIONS: {
                    tooltip_items : inter_tooltip_items
                },
                data_array : neighbor_map
            },
            { type: 'tile',
                label : 'Distal Intra-Chromosomal Associations',
                description : '',
                CONFIGURATION: {
                    fill_style :  function(link) { return re.plot.colors.link_sources_colors([link.sourceNode.source,link.targetNode.source]);},
                    stroke_style : function(link) { return re.plot.colors.link_sources_colors([link.sourceNode.source,link.targetNode.source]);},
                    track_height : 280,
                    track_padding: 15,             //required
                    tile_height : 2,
                    tile_padding:7,              //required
                    tile_overlap_distance:.1 * re.MILLION,    //required
                    tile_show_all_tiles : true,
                    track_fill_style : pv.color('#EEDDEE'),
                    track_line_width : 1,
                    track_stroke_style: pv.color('#000000'),
                    notifier : inter_chrom_click
                },
                OPTIONS: {
                    tooltip_items : inter_tooltip_items
                },
                data_array : tie_map
            }]
    }
    };
    var chrom_leng = vq.utils.VisUtils.clone(re.plot.chrome_length);
    var chr_match = chrom_leng.filter(function(chr_obj) { return chr_obj.chr_name == chrom;});
    var maxPos = Math.ceil(chr_match[0]['chr_length']);

    var lin_browser = new vq.LinearBrowser();
    var lin_data = {DATATYPE: 'vq.models.LinearBrowserData',CONTENTS: data_obj()};

    lin_browser.draw(lin_data);

    if (start != null && start > 0 && range_length != null && range_length > 0) {
        lin_browser.setFocusRange(start,range_length);
    }


    var e = new vq.events.Event('render_complete','linear',obj);
    e.dispatch();

    return lin_browser;
}


function isOrdinal(label) {
    return label =='B';
}

function isNominal(label) {
    return  label =='C';
}

function isNonLinear(label) {
    return isOrdinal(label) || isNominal(label);
}


function isNAValue(data_type,value) {
    if (isNonLinear(data_type))  return value == 'NA';
    else  return isNaN(value);
}

re.MILLION = 1000000;


function scatterplot_draw(params) {
    var data = params.data || re.plot.scatterplot_data || {data:[]},
        div = params.div || null,
        regression_type = params.regression_type || 'none',
        reverse_axes = params.reverse_axes || false,
        discretize_x = params.discretize_x || false,
        discretize_y = params.discretize_y || false;
    re.plot.scatterplot_data = data;

    if (data === undefined) {return;}  //prevent null plot

    var dataset_labels=re.ui.getDatasetLabels();
    var patient_labels = dataset_labels['patients'];
    var f1 = data.f1alias, f2 = data.f2alias;
    var f1label = data.f1alias, f2label = data.f2alias;
    var f1values, f2values;

    if (isNonLinear(f1label[0])) {
        f1values = data.f1values.split(':');
    } else {
        f1values = data.f1values.split(':').map(function(val) {return parseFloat(val);});
    }
    if (isNonLinear(f2label[0])) {
        f2values = data.f2values.split(':');
    } else {
        f2values = data.f2values.split(':').map(function(val) {return parseFloat(val);});
    }

    if (f1values.length != f2values.length) {
        vq.events.Dispatcher.dispatch(new vq.events.Event('render_fail','scatterplot','Data cannot be rendered correctly.'));
        return;
    }
    var data_array = [];
    for (var i=0; i< f1values.length; i++) {
        if (!isNAValue(f1label[0],f1values[i]) && !isNAValue(f2label[0],f2values[i]) ) {
            var obj = {};
            obj[f1] = f1values[i], obj[f2]=f2values[i], obj['patient_id'] = patient_labels[i];
            data_array.push(obj);
        }
    }

    function reverseAxes() {
        config.CONTENTS.xcolumnid = f2;config.CONTENTS.ycolumnid=f1;config.CONTENTS.xcolumnlabel=f2label;config.CONTENTS.ycolumnlabel=f1label;
        tooltip[data.f1alias]=f2;tooltip[data.f2alias]=f1;
        config.CONTENTS.tooltip_items=tooltip;
    }

    var tooltip = {};
    tooltip[data.f1alias] = f1,tooltip[data.f2alias] = f2,tooltip['Sample'] = 'patient_id';

    if(discretize_x && !isNonLinear(f1label[0])) {
        var values = data_array.map(function(obj){return obj[f1];});
        var quartiles = pv.Scale.quantile(values).quantiles(4).quantiles();
        //Freedman-Diaconis' choice for bin size
        var setSize = 2 * (quartiles[3] - quartiles[1]) / Math.pow(values.length,0.33);
        var max =pv.max(values), min = pv.min(values);
        setSize = (max - min)/setSize > 9 ? (max - min) / 10 : setSize;
        var firstBin = min+setSize/2;
        var bins = pv.range(firstBin,max-setSize/2+setSize/10,setSize);
        data_array.forEach(function(val) {
            val[f1] = bins[Math.min(Math.max(Math.floor((val[f1]-firstBin) / setSize),0),bins.length-1)];
        });
    }
    if(discretize_y && !isNonLinear(f2label[0])) {
        var values = data_array.map(function(obj){return obj[f2];});
        var quartiles = pv.Scale.quantile(values).quantiles(4).quantiles();
        //Freedman-Diaconis' choice for bin size
        var setSize = 2 * (quartiles[3] - quartiles[1]) / Math.pow(values.length,0.33);
        var max =pv.max(values), min = pv.min(values);
        setSize = (max - min)/setSize >= 9 ? (max - min) / 10 : setSize;
        var firstBin = min+setSize/2;
        var bins = pv.range(firstBin,max-setSize/2+setSize/10,setSize);
        data_array.forEach(function(val) {
            val[f2] = bins[Math.min(Math.max(Math.floor((val[f2]-firstBin) / setSize),0),bins.length-1)];
        });
    }
    f1label = (discretize_x ? 'C' : f1label[0]) + f1label.slice(1);
    f2label = (discretize_y ? 'C' : f2label[0]) + f2label.slice(1);
    var violin = (isNonLinear(f1label[0]) ^ isNonLinear(f2label[0])); //one is nonlinear, one is not
    var cubbyhole = isNonLinear(f1label[0]) && isNonLinear(f2label[0]);

    var sp,config;
    if (violin)     {
        sp = new vq.ViolinPlot();
        config ={DATATYPE : "vq.models.ViolinPlotData", CONTENTS : {
            PLOT : {container: div,
                width : 550,
                height: 300,
                vertical_padding : 40,
                horizontal_padding: 40,
                font :"14px sans"},
            data_array: data_array,
            xcolumnid: f1,
            ycolumnid: f2,
            valuecolumnid: 'patient_id',
            xcolumnlabel : f1label,
            ycolumnlabel : f2label,
            valuecolumnlabel : '',
            tooltip_items : tooltip,
            show_points : true,
            regression :regression_type
        }};
        if (isNonLinear(f2label[0])) {
            reverseAxes();
        }
        sp.draw(config);
    }
    else if(cubbyhole) {
        sp = new vq.CubbyHole();
        config ={DATATYPE : "vq.models.CubbyHoleData", CONTENTS : {
            PLOT : {container: div,
                width : 550,
                height: 300,
                vertical_padding : 40, horizontal_padding: 40, font :"14px sans"},
            data_array: data_array,
            xcolumnid: f1,
            ycolumnid: f2,
            valuecolumnid: 'patient_id',
            xcolumnlabel : f1label,
            ycolumnlabel : f2label,
            valuecolumnlabel : '',
            tooltip_items : tooltip,
            show_points : true,
            radial_interval : 7
        }};
        if (reverse_axes) {
            reverseAxes();
        }
        sp.draw(config);
    }
    else {
        sp = new vq.ScatterPlot();

        config ={DATATYPE : "vq.models.ScatterPlotData", CONTENTS : {
            PLOT : {container: div,
                width : 550,
                height: 300,
                vertical_padding : 40, horizontal_padding: 40, font :"14px sans"},
            data_array: data_array,
            xcolumnid: f1,
            ycolumnid: f2,
            valuecolumnid: 'patient_id',
            xcolumnlabel : f1label,
            ycolumnlabel : f2label,
            valuecolumnlabel : '',
            tooltip_items : tooltip,
            radial_interval : 7,
            regression :regression_type
        }};
        if (reverse_axes) {
            reverseAxes();
        }
        sp.draw(config);
    }

    var e = new vq.events.Event('render_complete','scatterplot',sp);
    e.dispatch();
    return sp;
}


function initializeGraph(obj) {
    var div_id = obj.div;

    // initialization options
    var options = {
        // where you have the Cytoscape Web SWF
        swfPath: re.cytoscape['swfPath'],
        // where you have the Flash installer SWF
        flashInstallerPath: re.cytoscape['flashInstallerPath']
    };
    re.cytoscape.obj = new org.cytoscapeweb.Visualization(div_id, options);
    re.cytoscape.data = obj.network;
}


function populateGraph(obj) {

    // you could also use other formats (e.g. GraphML) or grab the network data via AJAX
    var network = {
        dataSchema: {
            nodes: [ { name: "label", type: "string" },
                //{ name: "genescore", type: "number" },
                { name: "type", type: "string" },
                { name: "chr", type: "string" },
                { name: "start", type: "int" },
                { name: "end", type: "int" }
            ],
            edges: [ { name: "label", type:"string"},
                { name: "directed", type: "boolean", defValue: false} ].concat(
                re.model.association.types.map(function(obj) { return obj.vis.network.edgeSchema;}))
        },
        data:  re.cytoscape.data
    };

    var visual_style = {
        nodes: {
            shape:'ELLIPSE',
            size: 25,
            color: {
                defaultValue: '#FFF',
                customMapper: { functionName :'mapFeatureType'}
            },
            labelFontSize : 20,
            labelHorizontalAnchor: "center",
            labelVerticalAnchor : "top"
        },
        edges: {
            width: 3,
            color: "#0B94B1"
        }
    };

    // init and draw

    function rgbToHex(R,G,B) {return '#' + toHex(R)+toHex(G)+toHex(B)}
    function toHex(n) {
        n = parseInt(n,10);
        if (isNaN(n)) return "00";
        n = Math.max(0,Math.min(n,255));
        return "0123456789ABCDEF".charAt((n-n%16)/16)
            + "0123456789ABCDEF".charAt(n%16);
    }

    re.cytoscape.obj["mapFeatureType"] =  function(data)   {
        var color = re.plot.colors.node_colors(data.type);
        return rgbToHex(color.r,color.g,color.b);
    };
    var layout =getNetworkLayout();

    re.cytoscape.obj.ready(function() {
        re.display_options.cytoscape.ready = true;
        var e = new vq.events.Event('render_complete','graph',{});
        e.dispatch();
    });

    re.cytoscape.obj.draw({ network: network,

        // let's try another layout
        layout:layout,

        // set the style at initialisation
        visualStyle: visual_style });
}


function modifyCircvisObject(obj) {
    if (re.display_options.circvis.ticks.wedge_width_manually) {
        obj.PLOT.width=re.display_options.circvis.width;
    }
    if (re.display_options.circvis.ticks.wedge_width_manually) {
        obj.PLOT.height=re.display_options.circvis.height;
    }
    var chrom_keys = re.display_options.circvis.chrom_keys;

    var chrom_leng = vq.utils.VisUtils.clone(re.plot.chrom_length);

    if (re.display_options.circvis.ticks.tile_ticks_manually) {
        obj.TICKS.OPTIONS.tile_ticks  = true;
        obj.TICKS.OPTIONS.overlap_distance = re.display_options.circvis.ticks.tick_overlap_distance;
    }

    obj.PLOT.rotate_degrees = re.display_options.circvis.rotation;
    if (re.display_options.circvis.ticks.wedge_width_manually) {
        obj.TICKS.OPTIONS.wedge_width = re.display_options.circvis.ticks.wedge_width;
    }
    if (re.display_options.circvis.ticks.wedge_height_manually) {
        obj.TICKS.OPTIONS.wedge_height = re.display_options.circvis.ticks.wedge_height;
    }

    return obj;
}

function plotFeatureDistribution(params) {
    var data = params.data || re.plot.featureplot_data || {data:[]},
        div = params.div || null;

}