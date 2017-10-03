(function($){"use strict"; var DD_Global = {};
var DD_object = Class.extend({
    
    idTranslateObject: 'dd_translate',
    idEventObject: 'dd_event',
    idLayersObject: 'dd_layer',
    idSettingsObject: 'dd_settings',
    idWindow: 'dd_window',
    
    init: function (id) {
        this.id = id ? id : this.createUUID();
    },
    
    setGlobal: function () {
        DD_Global[this.id] = this;
    },
    getId: function () {
        return this.id;
    },
    getGlobal: function (id) {
        return DD_Global[id];
    },
    createUUID: function () {
        var s = [];
        var hexDigits = "0123456789abcdef";
        for (var i = 0; i < 36; i++) {
            s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
        }
        s[14] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
        s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
        s[8] = s[13] = s[18] = s[23] = "-";

        var uuid = s.join("");
        return uuid;
    },
    
    sortArray: function(_array, new_index, old_index) {
        var record = _array.splice(old_index, 1);
        _array.splice(new_index, 0, record[0]);
        return _array;
    },
    
    //translation
    _: function(key) {
        var translateObject = this.getGlobal(this.idTranslateObject); 
        if(translateObject) {
            return translateObject.get(key);
        }
        return key;
    },
    //events
    _evnt: function() {
        return this.getGlobal(this.idEventObject);
    },
    //layers
    _l: function() {
        return this.getGlobal(this.idLayersObject);
    },
    //settings
    _s: function(settingName) {
        var settingsObject = this.getGlobal(this.idSettingsObject);
        return settingsObject.settings[settingName];
    },
    //window
    _w: function(object) {
        if(object){
            this.getGlobal(this.idWindow);
        }
        return this.getGlobal(this.idWindow).modal;
    }
});

var DD_Event = DD_object.extend({
    id: 'dd_event',
    listEvents: {},
    listEventsBase: {}, //delete all callbacks after run
    listEventsCallbacks: {},
    init: function() {
        this._super(this.id);
        this.setGlobal();
    },
    
    register: function(eventName, obj, base) {
        if(this.listEvents[eventName]) {
            console.log('ERROR: event already exists('+eventName+'); Should be unique!');
            return;
        }
        if(!obj) {
            return;
        }
        this.listEvents[eventName] = obj;
        if(base) {
            this.listEventsBase[eventName] = obj; 
        }
    },
    
    unregister: function(eventName) {
        delete this.listEvents[eventName];
        delete this.listEventsBase[eventName];
        delete this.listEventsCallbacks[eventName];
    },
    
    registerCallback: function(eventName, func, id) {
        id = id ? id : this.createUUID();
        if(!this.listEventsCallbacks[eventName]) {
            this.listEventsCallbacks[eventName] = {};
        }
        if(this.listEventsCallbacks[eventName][id]) {
            return;
        }
        this.listEventsCallbacks[eventName][id] = func;
    },
    
    doCall: function(eventName, data) {
        var self = this;
        console.log('should doCall: ' + eventName);
        
        if(!this.listEvents[eventName] || !this.listEventsCallbacks[eventName]) {
            return;
        }
        console.log( this.listEventsCallbacks[eventName] );
        $.each(this.listEventsCallbacks[eventName], function (i, eventCall) {
            eventCall.call(self, self.listEvents[eventName], eventName, data);
            console.log('doCall real: ' + i + ' - ' + eventName);
        });
        if(this.listEventsBase[eventName]) {
            console.log('doCall real DELETE: ' +  ' - ' + eventName);
            delete this.listEventsCallbacks[eventName];
        }
    },
    
    getListEvents: function() {
        return this.listEvents;
    },
    
    getListEventCallback: function() {
        return $.extend(this.listEventsBase, this.listEvents);
    },
    
    isBase: function(eventName) {
        return this.listEventsBase[eventName];
    },
    
    getEventObject: function(eventName) {
        return this.listEvents[eventName];
    },
    
    getEventCallBacks: function(eventName) {
        return this.listEventsCallbacks[eventName];
    },
    
    unregisterAll: function() {
        var self = this;
        $.each(this.listEvents, function(eventName, obj) {
            self.unregister(eventName);
        });
    }
});

var DD_Translator = DD_object.extend({

    id: 'dd_translate',
    translateObject: {},
    init: function(translate) {
        this._super(this.id);
        this.setGlobal();
        this.setTranslation(translate);
    },
    setTranslation: function(translate) {
        this.translateObject = translate ? translate : {};
    },
    get: function(key) {
        if(typeof(this.translateObject[key]) !== 'undefined') {
            return this.translateObject[key];
        }
        return key;
    }
});

var DD_Settings = DD_object.extend({
    id: 'dd_settings',
    init: function(settings) {
        this._super(this.id);
        this.settings = settings;
        this.setGlobal();
    }
})

var DD_Window = DD_object.extend({
    CONST_WIN_WIDTH: 300,
    CONST_WIN_CONTENT_EL: 'modalContent',
    CONST_WIN_PREVIEW_EL: 'previewContent',

    id: 'dd_window',
    init: function () {
        if (this.getGlobal(this.id)) {
            return;
        }
        this._super(this.id);
        this.createContentElement(this.CONST_WIN_CONTENT_EL);
        this.createContentElement(this.CONST_WIN_PREVIEW_EL);
        this.registerModal();
        this.registerPreview();
        this.setGlobal();
        
        return this.modal;
    },
    
    registerPreview: function() {
        var self = this;
        
        this.preview = new jBox('Modal', {
            title: '-',
            draggable: false,
            overlay: false,
            close: true,
            content: $('#' + this.CONST_WIN_PREVIEW_EL),
            width: $(window).width(),
            fixed: false,
            height: $(window).width(),
            repositionOnOpen: false,
            repositionOnContent: true,
            fixed: true,
            onOpen: function () {
                self._evnt().doCall('preview-showed');
            },
            onClose: function () {
                self._evnt().doCall('preview-closed');
            }
        });


        this._evnt().register('preview-showed', this.modal);
        this._evnt().register('preview-closed', this.modal, true);
    },
    
    registerModal: function() {
        var self = this;
        
        this.modal = new jBox('Modal', {
            title: '-',
            draggable: 'title',
            overlay: false,
            close: true,
            content: $('#' + this.CONST_WIN_CONTENT_EL),
            width: this.getWinWidth(),
            fixed: false,
            maxHeight: 500,
            repositionOnOpen: false,
            repositionOnContent: true,
            target: $('.canvas-container'),
            onOpen: function () {
                self._evnt().doCall('window-showed');
            },
            onClose: function () {
                self._evnt().doCall('window-closed');
            }
        });


        this._evnt().register('window-showed', this.modal);
        this._evnt().register('window-closed', this.modal, true);
        this.registerCloseWinEventCall();
    },

    getWindow: function () {
        return this.getGlobal(this.id).modal;
    },

    getPreview: function () {
        return this.getGlobal(this.id).preview;
    },

    getContentElement: function () {
        return this.getGlobal(this.id).contentElement[this.CONST_WIN_CONTENT_EL];
    },

    getContentElementPreview: function () {
        return this.getGlobal(this.id).contentElement[this.CONST_WIN_PREVIEW_EL];
    },

    getWinWidth: function () {
        return this.CONST_WIN_WIDTH;
    },

    createContentElement: function (id) {
        if(!this.contentElement) {
            this.contentElement = {};
        }
        if($('#' + id).get(0)) {
            this.contentElement[id] = $('#' + id);
            return;
        }
        this.contentElement[id] = $('<div />').attr({
            'id': id
        }).css({
            'display': 'none'
        }).html('<p>&nbsp;</p>');

        $('body').append(this.contentElement[id]);
    },
    
    registerCloseWinEventCall: function() {
        this._evnt().registerCallback('window-closed', function(window) {
            window.isClosed = true;
        }, 'no-reposition');
    }
});


var DD_Uibase = DD_object.extend({
    options: {},

    init: function (id) {
        this._super(id);
    },

    getParent: function () {
        return $(this.options.parent);
    },

    get: function () {
        return this.self;
    },

    selfBase: function (tag) {
        tag = tag ? tag : '<div/>';
        this.self = $(tag, {
            id: this.getId(),
            class: this.mainClass + ' ' + (this.options.class ? this.options.class : ''),
        });
    },

    _add: function () {
        this._onBeforeCreate();
        $(this.options.parent).append(this.self);
        if (this._addElements) {
            this._addElements();
        }
        var model = this._onAfterCreate();
        if (model) {
            model.registerEvents();
            return model;
        }
    },

    _onBeforeCreate: function () {
        this.windowInit();
    },

    _onAfterCreate: function () {
        var model = null;
        if (this.model) {
            eval("try {model = new " + this.model + "(this); }catch(err) {console.log('ERROR FOR MODEL: " + this.model + "; ERRTXT: ' + err + '; err.lineNumber: ' + err.lineNumber)}");
        }
        if (this.options.windowOpener && model) {
            this.addWindowOpenEvent(this, model, this.modal, this.options);
        }
        if (model) {
            return model;
        }
    },

    addWindowOpenEvent: function (me, model, modal, options) {
        var obj = me.get();
        $(obj).on('click', function () {
            if (!options.windowPreview) {
                var window = modal.getWindow();
                var contentElement = modal.getContentElement();
            } else {
                var window = modal.getPreview();
                var contentElement = modal.getContentElementPreview();
            }

            contentElement.empty();
            model.setWindowContent(contentElement);
            model.setWindow(window);

            window.setTitle(model.getWindowTitle())
            window.open({});

            if (!window.isClosed && !options.windowPreview) {
                window.position({target: $('.canvas-container')});
            }
        });
    },

    windowInit: function () {
        if (!this.winInit) {
            this.modal = new DD_Window();
            this.winInit = true;
        }
    }

});

var DD_Debug = DD_object.extend({
    init: function (obj) {
        this.obj = obj;
        this.addDebug();
        this.addControls();
        this.addConsole();
        this.attachEvents();
    },
    attachEvents: function () {
        var self = this;
        this.listEventsBtn.on('click', function () {
            var events = self._evnt().getListEvents();
            self.consoleInner.html('');
            self.title.html('All registrated Events');
            var eventsHtml = '';
            $.each(events, function (index, event) {
                if (event.get) {
                    var el = event.get();
                    eventsHtml += '<a href="javascript:void(0)" class="debugger-event" style="color:#fff;">' + index + '</a>'
                            + ' <a href="javascript:void(0)" class="debugger-event-element">(#' + el.attr('id') + ' .' + el.get(0).className + ')</a>'
                            + (self._evnt().isBase(index) ? ' - BASE ' : '') + '<br>';
                } else {
                    eventsHtml += '<a href="javascript:void(0)" class="debugger-event" style="color:#fff;">' + index
                            + (self._evnt().isBase(index) ? ' - BASE ' : '') + '</a><br>';
                }
            });
            self.consoleInner.html(eventsHtml);
        });
        if (typeof (this._l()) != 'undefined') {

            this.listLayers.on('click', function () {
                var layers = self._l().layers;
                self.consoleInner.html('');
                self.title.html('All added Layers');
                var layersHtml = '';
                $.each(layers, function (index, layer) {
                    layersHtml += '<a href="javascript:void(0)" class="debugger-layer" style="color:#fff;">' + index + '. '
                            + layer.type + '<br>' +
                            JSON.stringify(layer.data) +
                            '</a>'
                            + '<br><br>';
                });
                self.consoleInner.html(layersHtml);
            });
        }
    },
    addDebug: function () {
        console.log('Debug started!');
        this.parentDiv = $('<div/>', {
            id: 'dd-debugger',
            class: 'debugger-container',
            style: 'border:1px solid silver; min-height:500px;margin:20px;'
        });
        this.obj.after(this.parentDiv);
    },
    addControls: function () {
        this.controlsContainer = $('<div/>', {
            id: 'dd-debugger-controls',
            class: 'debugger-controls',
            style: 'margin:20px;'
        });
        this.parentDiv.append(this.controlsContainer);
        this.listEventsBtn = $('<button/>', {
            id: 'dd-debugger-controls-list-btn',
            class: 'debugger-controls button',
            text: 'List Events'
        });
        this.controlsContainer.append(this.listEventsBtn);
        if (typeof (this._l()) != 'undefined') {
            this.listLayers = $('<button/>', {
                id: 'dd-debugger-controls-list-btn',
                class: 'debugger-controls button',
                text: 'List Layers'
            });
            this.controlsContainer.append(this.listLayers);
        }
    },
    addConsole: function () {
        this.console = $('<div/>', {
            id: 'dd-debugger-console',
            class: 'debugger-console',
            style: 'border:1px solid silver; height:500px;margin:20px; overflow:auto; background: #300a24; color:#fff;padding:7px; '
        });
        this.parentDiv.append(this.console);
        this.title = $('<h3/>', {
            style: 'color:#0a9890; text-transform:uppercase; text-align:center; padding:10px 0'
        });
        this.console.append(this.title);
        this.consoleInner = $('<div/>', {
            id: 'dd-debugger-console-inner',
        });
        this.console.append(this.consoleInner);
    }
});

var DD_ModelBase = DD_object.extend({

    init: function () {
        if (this.eventBase) {
            this._evnt().register(this.eventBase, this.obj, this.base);
        }
    },
    
    registerEvents: function() {
        if (this._registerEvents) {
            this._registerEvents();
        }
        if (this._registerCalls) {
            this._registerCalls();
        }
        if (this._onComplete) {
            this._onComplete();
        }
        this.callBackObject();
    },
    
    callBackObject: function() {
        if(!this.obj) {
            return;
        }
        if(this.obj._callBackModel) {
            this.obj._callBackModel.call(this.obj, this);
        }
    },

    clickEventName: function () {
        return this.eventClick;
    },

    setWindow: function (window) {
        this.window = window;
    },

    closeWindow: function () {
        if (this.window) {
            this.window.close();
        }
    }
});

var DD_History = DD_object.extend({
    
});

var DD_Layer = DD_object.extend({
    layers: [],
    id: 'dd_layer',
    canvas: null,
    last: 0,
    
    TYPE_IMG: 'img',
    TYPE_TXT: 'txt',
    
    init: function() {
        this._super(this.id);
        this.setGlobal();
    },
    
    setHeight: function(height) {
        this.height = height;
    },
    
    getHeight: function(height) {
        return this.height;
    },
    
    setWidth: function(width) {
        this.width = width;
    },
    
    getWidth: function(width) {
        return this.width;
    },
    
    getBgCanvas: function() {
        return this.bgCanvas;
    },
    
    getHoverCanvas: function() {
        return this.hoverCanvas;
    },
    
    setBgCanvas: function(canvas) {
        this.bgCanvas = canvas;
    },
    
    setHoverCanvas: function(canvas) {
        this.hoverCanvas = canvas;
    },
    
    getLast: function() {
        return this.layers.length;
    },
    
    setMask: function(mask){
        if(mask === null) {
            delete this.layerMask;
            return;
        }
        this.layerMask = mask;
    },
    
    getMask: function() {
        return this.layerMask;
    }
    
});

var DD_button = DD_Uibase.extend({
    mainClass: 'button',
    init: function (options) {
        this.options = $.extend(( options ? options : {} ) , this.options);
        if(this.options.model) {
           this.model = this.options.model; 
        }
        this._super(this.options.id);
        this.self = $('<button />', {
            id: this.getId(),
            class: this.mainClass + ' ' + (this.options.class ? this.options.class : ''),
            text: (this.options.text && !this.options.fa && !this.options.fa_addon  ? this.options.text : '')
        });
        this.add();
        if(this.options.fa_addon){
            var fa = $('<span />', {
                class: this.options.fa_addon + ' extra-fa fa-lg'
            });
            this.self.append(fa);
            if(this.options.text) {
                this.self.append(this.options.text);
            }
        }
    },
    
    add: function() {
        this._add();
    }
});



var DD_checkbox = DD_Uibase.extend({
    mainClass: 'dd-checkbox-container',
    labelClass: 'dd-label',
    init: function (options) {
        this.options = $.extend((options ? options : {}), this.options);
        if (this.options.model) {
            this.model = this.options.model;
        }
        this._super(this.options.id);
        this.selfBase();
        this._add();
    },

    _addElements: function () {

        this._checkbox = $('<input />', {
            id: this.createUUID(),
            class: this.mainClass + ' ' + (this.options.class ? this.options.class : ''),
            type: 'checkbox'
        });
        if (this.checked) {
            this._checkbox.attr({
                'checked': true
            }).prop('checked');
        }
        this.self.append(this._checkbox);

        if (this.options.text) {
            this.self.append($('<label />')
                    .addClass(this.labelClass)
                    .attr({'for': this._checkbox.attr('id')})
                    .text(this.options.text));
        }
    },

    _callBackModel: function (model) {
        if (!model || !model.checkedAction || !model.uncheckedAction) {
            return;
        }
        var self = this;
        this._checkbox.on('click', function () {
            if ($(this).is(':checked')) {
                model.checkedAction.call(model, this, self.options.view);
            } else {
                model.uncheckedAction.call(model, this, self.options.view);
            }
        });
        setTimeout(function () {
            if (self.checked) {
                model.checkedAction.call(model, self._checkbox, self.options.view);
                return;
            }
            model.uncheckedAction.call(model, self._checkbox, self.options.view);
        }, 10);
    }
});

var DD_control = DD_Uibase.extend({
    mainClass: 'dd-helper-popup',
    contentAdded: false,
    init: function (options) {
        this.options = $.extend((options ? options : {}), this.options);
        if (!this.options.fabricObject) {
            return;
        }
        if (!this.options.fabricObject.controlModel) {
            return;
        }
        this.model = this.options.fabricObject.controlModel;
        this._super(this.options.id);
        this.self = $('<div />', {
            id: this.getId(),
            class: this.mainClass + ' ' + (this.options.class ? this.options.class : '')
        });
        this._add();
    },

    _addElements: function () {
        this.addButtonPanel();
        this.addContentControls();
    },

    _callBackModel: function (model) {
        model._initBase();
        model.hideContentEvent();
    },

    addContentControls: function () {
        this.contentContainer = new DD_panel({
            'parent': this.self,
            'class': 'dd-helper-popup-content-container clearfix'
        });
        this.contentContainer._add();
        this.content = new DD_panel({
            'parent': this.contentContainer.get(),
            'class': 'dd-helper-popup-content'
        });
        this.content._add();
        this._closeContent = new DD_button({
            'parent': this.contentContainer.get(),
            //'text': this._('delete'),
            'class': 'fa fa-angle-double-up dd-helper-popup-content-close'
        });
    },

    addButtonPanel: function () {
        this.buttons = new DD_panel({
            'parent': this.self,
            'class': 'dd-helper-popup-buttons clearfix'
        });
        this.buttons._add();
    },

    addDeleteBase: function () {
        this._delete = new DD_button({
            'parent': this.buttons.get(),
            //'text': this._('delete'),
            'class': 'fa fa-trash'
        });

        return this._delete;
    },

    addRotateBase: function () {
        this._rotate = new DD_button({
            'parent': this.buttons.get(),
            //'text': this._('delete'),
            'class': 'fa fa-refresh'
        });

        return this._rotate;
    },

    addSaveBase: function () {
        this._save = new DD_button({
            'parent': this.buttons.get(),
            //'text': this._('save'),
            'class': 'fa fa-floppy-o'
        });

        return this._save;
    },

    addSizeBase: function () {
        this._size = new DD_button({
            'parent': this.buttons.get(),
            //'text': this._('save'),
            'class': 'fa fa-arrows fa-rotate-45'
        });

        return this._size;
    },

    addControlBase: function (attrs) {
        this.control = $('<input>').attr({'type': 'range'}).addClass('dd-helper-range');
        if (attrs) {
            this.control.attr(attrs);
        }
        this.content.get().append(this.control);
    },

    fontSelector: function (parent, fonts) {
        var fontSelectorContainer = new DD_panel({
            'parent': parent,
            'class': 'dd-helper-font-selector-container'
        });
        fontSelectorContainer._add();
        
        //fontSelect
        var uid = this.createUUID();

        var fontSelect = $('<div />').attr({
                    'id': uid,
                }).addClass('fontSelect').html('<div class="arrow-down"></div>');
                
        fontSelectorContainer.get()
                .append(fontSelect);

        $(fontSelect).fontSelector({
            'hide_fallbacks': true,
            'initial': 'Courier New,Courier New,Courier,monospace',
            'selected': function (style) {
                console.log("S1: " + style);
            },
            'fonts': [
                'Arial,Arial,Helvetica,sans-serif',
                'Arial Black,Arial Black,Gadget,sans-serif',
                'Comic Sans MS,Comic Sans MS,cursive',
                'Courier New,Courier New,Courier,monospace',
                'Georgia,Georgia,serif',
                'Impact,Charcoal,sans-serif',
                'Lucida Console,Monaco,monospace',
                'Lucida Sans Unicode,Lucida Grande,sans-serif',
                'Palatino Linotype,Book Antiqua,Palatino,serif',
                'Tahoma,Geneva,sans-serif',
                'Times New Roman,Times,serif',
                'Trebuchet MS,Helvetica,sans-serif',
                'Verdana,Geneva,sans-serif',
                'Gill Sans,Geneva,sans-serif'
            ]
        });
    },

    colorSelector: function (parent, name, color, onUpdate) {
        var colorSelectorContainer = new DD_panel({
            'parent': parent,
            'class': 'dd-helper-color-selector-container'
        });

        colorSelectorContainer._add();

        var uid = this.createUUID();

        colorSelectorContainer.get()
                .append($('<input />').attr({
                    'id': uid,
                    'type': 'text'
                }));

        $("#" + uid).spectrum({
            allowEmpty: true,
            color: color
        });
        colorSelectorContainer.get()
                .append($('<span />').text(name)
                        .addClass('dd-helper-color-selector-title'));
    }

});

var DD_ImageLinkAdd = DD_Uibase.extend({
    
    mainClass: 'dd-image-link',
    defaultImageClass: 'size-medium',
    model: 'DD_ImageLink_Model',
    
    init: function(options) {
        this.options = options;
        this._super(this.options.id);
        this.self = $('<a />', {
            id: this.getId(),
            class: this.mainClass + ' ' + (this.options.class ? this.options.class : this.defaultImageClass),
            href: 'javascript:void(0)',
            "data-src": options.src,
            "data-width": options.width,
            "data-height": options.height
        });
        this.add();
    },
    
    add: function() {
        this.image = $('<img />', {
            src: this.options.src
        });
        this.self.append( this.image );
        this._add();
        
        this.model.setClickEvents(this.self);
    }
    
    
});

var DD_panel = DD_Uibase.extend({
    mainClass: 'panel',
    init: function (options) {
        this.options = $.extend(( options ? options : {} ) , this.options);
        if(!this.parent ) {
            this.parent = this.options.parent;
        }
        this._super(this.options.id);
        this.selfBase();
    },
    
    add: function() {
        return this._add();
    }
});

var DD_Tabs = DD_Uibase.extend({
    mainClass: 'tabs-container',
    classTabs: 'tabs',
    classTabsContentContainer: 'tab-content-container',
    classTabsContent: 'tab-content',
    classTabCurrent: 'current',

    tabs: {},
    tabsContent: {},

    init: function (options) {
        this.options = options;
        this._super(this.options.id);
        this.selfBase();
        this._add();
    },
    
    _addElements: function() {
        this.addTabs();
    },
    
    _callBackModel: function (model) {
        var self = this;
        this.setEvents(model);
        if (this.current && model.tabActive) {
            setTimeout(function () {
                model.tabActive(self.current.attr('id'), self.currentContent);
            }, 100);
        }
    },

    addTabs: function () {
        var self = this;
        this.createTabPanel();
        this.createTabContent();
        $.each(this.options.tabs, function (a, tab) {
            self.tabsContent[tab.id] = $('<div />')
                    .attr('id', 'content-' + tab.id)
                    .addClass(self.classTabsContent);
            
            self.tabs[tab.id] = $('<li />')
                    .attr('id', tab.id)
                    .text(tab.text)
                    .attr('data-index', tab.id);
            if (a == 0 && !self.options.activeTab) {
                self.tabs[tab.id].addClass('current');
                self.tabsContent[tab.id].addClass('current');
                self.current = self.tabs[tab.id];
                self.currentContent = self.tabsContent[tab.id];
            }
            self.tabPanel.append(self.tabs[tab.id]);
            self.tabContent.append(self.tabsContent[tab.id]);
            
        });
        
    },

    createTabPanel: function () {
        this.tabPanel = $('<ul />')
                .addClass(this.classTabs);
        this.self.append(this.tabPanel);
    },

    createTabContent: function () {
        this.tabContent = $('<div />')
                .addClass(this.classTabsContentContainer);
        this.self.append(this.tabContent);
    },

    setEvents: function (model) {
        var self = this;
        this.tabPanel.find('li').on('click', function () {
            var id = $(this).attr('id');
            self.tabPanel.find('.current')
                    .removeClass('current');
            self.tabContent.find('.current')
                    .removeClass('current');
            var index = parseInt($(this).attr('data-index'));
            self.tabsContent[id]
                    .addClass('current');
            $(this).addClass('current');
            
            if (model.tabActive) {
                model.tabActive(id, self.tabsContent[id]);
            }

        });
    }
});

var DD_AddFromLibrary_Model = DD_ModelBase.extend({
    getWindowTitle: function () {
        return this._('add_from_library');
    },

    setWindowContent: function (parent) {
        
    }
});

var DD_AddPhoto_Model = DD_ModelBase.extend({
    idUploaderTab: 'dd-add-photo-tab',
    idMyPhotosTab: 'dd-my-photo-tab',
    uploaderInitiated: false,
    
    init: function (obj) {
        this.obj = obj;
        this._super(obj);
    },
    
    getWindowTitle: function () {
        return this._('add_photo_to_image');
    },

    setWindowContent: function (parent) {
        new DD_windowPhotoTabs(parent);
    },

    tabActive: function (id, content) {
        if (id === this.idMyPhotosTab) {
            this.initMyPhotos(content);
        } else if (id === this.idUploaderTab) {
            this.initUploader(content);
        }
    },

    initUploader: function (content) {
        if (this.uploaderInitiated) {
            return;
        }
        this.content = content;
        var self = this;
        content.html(this._('drop_files_or_upload'));
        content.dropzone({
            url: self._s('urlUploadImages') + '?form_key=' + window.FORM_KEY,
            maxFilesize: 2, // MB
            acceptedFiles: '.png, .jpeg, .jpg, .gif',
            init: function () {
                this.on("addedfile", function (file) {
                    if (self.previousFile) {
                        self.previousFile.fadeOut();
                        delete self.previousFile;
                    }
                });
                this.on("success", function (file, responseText) {
                    self.previousFile = $(file.previewElement);
                    var obj = responseText;
                    if (!obj) {
                        return processUploaderError(file, responseText);
                    }
                    if (obj.error) {
                        return processUploaderError(file, responseText, obj.errMessage);
                        return;
                    }
                    $(file.previewElement).find('.dz-error-mark').hide();
                    $(file.previewElement).find('.dz-success-mark').show();
                    $(file.previewElement).find('.dz-details').hide();
                    new DD_Layer_Img({
                        src: obj.filename,
                        width: obj.width,
                        height: obj.height
                    });
                    setTimeout(function () {
                        self._w().close();
                    }, 500);
                });
                this.on("error", function (file, responseText) {
                    self.previousFile = $(file.previewElement);
                    return processUploaderError(file, responseText);
                })
            }});
        this.uploaderInitiated = true;

        function processUploaderError(file, responseText, extraText) {
            $(file.previewElement).find('.dz-error-message').html(self._('uploader_error') + '<br>' + (extraText ? extraText : ''));
            $(file.previewElement).find('.dz-success-mark').hide();
            $(file.previewElement).find('.dz-details').hide();

            $(file.previewElement).find('.dz-error-mark').on('click', function () {
                $(file.previewElement).hide();
            });
        }
    },

    initMyPhotos: function (content) {
        var self = this;
        content.html(this._('loading') + '...')
                .addClass('tab-loading');

        $.ajax({
            url: this._s('myFilesPath'),
            type: 'json'
        })
                .done(function (data) {
                    content.removeClass('tab-loading');
                    if (!data || data.length == 0) {
                        content.html(self._('no_data'))
                        content.addClass('tab-no-data');
                        return;
                    }
                    content.removeClass('tab-no-data');
                    content.html('');

                    return;
                    $.each(data, function (a) {
                        var img = data[a];
                        new DD_ImageLinkAdd({
                            'parent': content,
                            'src': img.src,
                            'width': img.width,
                            'height': img.height
                        });
                    });

                });

    }

});

var DD_AddText_Model = DD_ModelBase.extend({
    
    init: function (obj) {
        this.obj = obj;
        this._super(obj);
    },
    
    getWindowTitle: function() {
        return this._('add_text_to_image');
    },
    
    setWindowContent: function(parent) {
        this.form = new DD_windowTextForm(parent);
        this.setSaveTextEvent();
    },
    
    setSaveTextEvent: function() {
        var textarea = this.form.get().find('textarea');
        var self = this;
        this.form.get().find('button').on('click', function() {
            //alert(textarea.val());
            var text = textarea.val();
            if(text.trim() == '') {
                textarea.addClass('empty');
            }else{
                textarea.removeClass('empty');
                textarea.addClass('valid');
                new DD_Layer_Text({
                    text: text.trim()
                });
                self.closeWindow();
            }
        });
    }
});

var DD_Control_Base_Model = DD_ModelBase.extend({
    controlTitleClass: 'control-title',

    init: function (obj) {
        this.obj = obj;
        this._super();
    },

    _initBase: function () {
        this.obj.options.fabricObject.controlModelCreated = this;
    },

    initPosition: function () {
        this.obj.get().css({
            left: this.calcLeftosition(),
            top: this.calcTopPosition()
        });
        this.obj.get().fadeIn('slow');
        if (this._addControls && !this.obj.options.fabricObject.controlsAdded) {
            this._addControls();
            this.obj.options.fabricObject.controlsAdded = true;
        }
    },

    titleControl: function (titleText) {
        this.obj.content.get()
                .append($('<span />').addClass(this.controlTitleClass).text(titleText));
    },

    sizeBase: function () {
        var self = this;
        var fabricObj = this.obj.options.fabricObject;
        var canvas = this._l().getHoverCanvas();

        this.obj._size.get().on('click', function () {
            
            var defaultScale = self.obj.options.fabricObject.defaultScale
                    ? self.obj.options.fabricObject.defaultScale
                    : self.obj.options.fabricObject.scaleX;

            //defaultScale = defaultScale ? defaultScale : 1;    
            if (!self.obj.options.fabricObject.defaultScale) {
                self.obj.options.fabricObject.defaultScale = defaultScale;
            }
            var currentScale = self.obj.options.fabricObject.scaleX;
            
            self.obj.content.get().empty();
            self.titleControl(self._('change_size'));
            self.obj.addControlBase({
                'min': 0,
                'max': 2,
                'step': 0.01,
                'value': currentScale / defaultScale
            });
            self.obj.contentContainer.get().show();
            self.obj.control.on('input', function () {
                var val = $(this).val();
                val = val * defaultScale;

                fabricObj.set({
                    'scaleX': parseFloat(val),
                    'scaleY': parseFloat(val)
                });
                fabricObj.setCoords();
                canvas.renderAll();
            });

            self.obj.control.on('mouseup', function () {
                canvas.trigger('object:modified', {target: fabricObj});
            });
            
        });
    },

    rotateBase: function () {
        var self = this;
        var fabricObj = this.obj.options.fabricObject;
        var canvas = this._l().getHoverCanvas();
        this.obj._rotate.get().on('click', function () {
            
            self.obj.content.get().empty();
            self.titleControl(self._('rotate'));
            self.obj.addControlBase({
                'min': 0,
                'max': 360,
                'value': parseInt(fabricObj.get('angle'))
            });
            self.obj.contentContainer.get().show();
            self.obj.control.on('input', function () {
                var val = $(this).val();
                fabricObj.setAngle(val);
                fabricObj.setCoords();
                canvas.renderAll();
            });

            self.obj.control.on('mouseup', function () {
                canvas.trigger('object:modified', {target: fabricObj});
            });
            
        });
    },

    baseEvents: function () {
        if (this.obj._size) {
            this.sizeBase();
        }
        if (this.obj._rotate) {
            this.rotateBase();
        }
    },
    
    hideContentEvent: function() {
        var self = this;
        this.obj._closeContent.get().on('click', function() {
            self.obj.contentContainer.get().hide();
        });
    },

    removeBase: function () {
        this.obj.options.fabricObject.remove();
    },

    calcTopPosition: function () {
        return '0';
    },

    calcLeftosition: function () {
        return '0';
    },

    hide: function () {
        this.obj.contentContainer.get().hide()
        this.obj.get().fadeOut('fast');
    },

    remove: function () {
        this.obj.get().remove();
    }
});

var DD_ImageLink_Model = DD_ModelBase.extend({

    setClickEvents: function (obj) {
        var self = this;
        obj.on('click', function () {
            new DD_Layer_Img({
                src: $(this).attr('data-src'),
                width: parseInt($(this).attr('data-width')),
                height: parseInt($(this).attr('data-height'))
            });
            self._w().close();            
        });
    }
});

var DD_Main_Model = DD_ModelBase.extend({
    eventBase: 'main-panel-created',
    eventClick: 'panel-click',
    eventObjectChanged: 'object-changed',
    eventObjectAdded: 'object-added',
    base: true,
    init: function (obj) {
        this.obj = obj;
        this._super();
        this.initLayers();
    },

    registerEvents: function () {
        this._evnt().register(this.eventClick, this.obj);
        this._evnt().register(this.eventObjectChanged, this.obj);
        this._evnt().register(this.eventObjectAdded, this.obj);
    },

    initLayers: function () {
        var self = this;
        this.layersObj = new DD_Layer();
        var idBgCanvas = 'canvas-' + this.createUUID();
        var idCanvasHover = 'canvas-hover-' + this.createUUID();
        var bgCanvas = $('<canvas/>', {
            id: idBgCanvas
        });
        var hoverCanvas = $('<canvas/>', {
            id: idCanvasHover
        });
        var width = this.obj.options.width;
        var height = this.obj.options.height;
        bgCanvas.attr({
            'width': width,
            'height': height
        });
        hoverCanvas.attr({
            'width': width,
            'height': height
        });
        this.obj.self.append(bgCanvas);
        var div = $('<div />').addClass('canvas-absolute')
                .append(hoverCanvas);
        this.obj.self.append(div);

        var bgCanvas = new fabric.Canvas(idBgCanvas);
        var hoverCanvas = new fabric.Canvas(idCanvasHover);
        
        this.layersObj.setBgCanvas(bgCanvas);
        this.layersObj.setHoverCanvas(hoverCanvas);
        this.layersObj.setHeight(height);
        this.layersObj.setWidth(width);

        new DD_Layer_Main({
            width: width,
            height: height,
            src: this.obj.options.src
        });

        this._canvasEvents(hoverCanvas);
        this._addObjects(this.obj.options);

        this.resize(width, height);
        $(window).on('resize', function () {
            self.resize(width, height);
        });
        return;
    },

    _canvasEvents: function (hoverCanvas) {
        var self = this;
        hoverCanvas.on('object:added', function (e) {
            console.log('object:added');
            new DD_control({
                parent: self.obj.self,
                fabricObject: e.target
            });
            if (e.target.uid) {
                return;
            }
            e.target.uid = self.createUUID();
            e.target.uid.toString();
            self._onUpdate(e.target, 'update');

        });
        hoverCanvas.on('object:moving', function (e) {
            if (e.target.controlModelCreated) {
                e.target.controlModelCreated.hide();
            }
        });
        hoverCanvas.on('object:scaling', function (e) {
            if (e.target.controlModelCreated) {
                e.target.controlModelCreated.hide();
            }
        });
        hoverCanvas.on('object:rotating', function (e) {
            if (e.target.controlModelCreated) {
                e.target.controlModelCreated.hide();
            }
        });
        hoverCanvas.on('object:skewing', function (e) {
            if (e.target.controlModelCreated) {
                e.target.controlModelCreated.hide();
            }
        });

        hoverCanvas.on('before:selection:cleared', function (e) {
            if (e.target.controlModelCreated) {
                e.target.controlModelCreated.hide();
            }
        });
        hoverCanvas.on('object:selected', function (e) {
            if (e.target.controlModelCreated) {
                e.target.controlModelCreated.initPosition();
            }
        })
        hoverCanvas.on('object:modified', function (e) {
            if (e.target.controlModelCreated) {
                e.target.controlModelCreated.initPosition();
            }
            self._onUpdate(e.target, 'update');
        });
        hoverCanvas.on('object:removed', function (e) {
            self._onUpdate(e.target, 'remove');
            if (e.target.controlModelCreated) {
                e.target.controlModelCreated.remove();
            }
        });
    },

    _addObjects: function (options) {
        if (options.mask) {
            var mask = new DD_Layer_Mask(options.mask, true);
            mask.save();
        }
        if (options.conf) {
            var last = options.conf.length;
            $(options.conf).each(function (i, obj) {
                var notSelect = (last - 1) == i ? false : true;
                if (obj.type === 'image') {
                    new DD_Layer_Img(null, obj, notSelect);
                }
                if(obj.type === 'text') {
                    new DD_Layer_Text(null, obj, notSelect);
                }
            });
        }
        ;
    },

    _onUpdate: function (fabricObj, type) {
        var newObject = fabricObj.toJSON();
        newObject.uid = fabricObj.uid;
        if (fabricObj.layerMask) {
            newObject.layerMask = true;
        }
        if (fabricObj.controlModel) {
            newObject.controlModel = fabricObj.controlModel;
        }

        if (this.obj.options.onUpdate) {
            this.obj.options.onUpdate.call(
                    null,
                    newObject,
                    this.obj.options.group_index,
                    this.obj.options.media_id,
                    type);
        }
    },

    resize: function (width, height) {
        var blockWidth = this.obj.self.width();
        var newWidth, newHeight;
        var proportion = height / width;
        newWidth = blockWidth;
        newHeight = proportion * newWidth;
        if (blockWidth < width) {
            var bgCanvas = this.layersObj.getBgCanvas();
            var hoverCanvas = this.layersObj.getHoverCanvas();
            var scaleFactor = blockWidth / this._l().getWidth();
            if (scaleFactor != 1) {
                bgCanvas.setWidth(blockWidth);
                bgCanvas.setHeight(newHeight);
                bgCanvas.setZoom(scaleFactor);
                bgCanvas.calcOffset();
                bgCanvas.renderAll();
                hoverCanvas.setWidth(blockWidth);
                hoverCanvas.setHeight(newHeight);
                hoverCanvas.setZoom(scaleFactor);
                hoverCanvas.calcOffset();
                hoverCanvas.renderAll();
            }
            return;
        }
        return;
    },
    
    destroy: function() {
        this._evnt().unregisterAll();
        this.obj.self.parent().empty();
        this.obj.self.parent().remove();
        
        delete this;
    }
});

var DD_control_image = DD_Control_Base_Model.extend({
    init: function (obj) {
        this._super(obj);
    },
    _addControls: function () {
        this.addDelete();
        this.obj.addRotateBase();
        this.obj.addSizeBase();
        
        this.baseEvents();
    },
    
    addDelete: function() {
        var self = this;
        var _delete = this.obj.addDeleteBase();
        _delete.get().on('click', function() {
            self.removeBase();
        });
    }
});

var DD_control_mask = DD_Control_Base_Model.extend({
    init: function (obj) {
        this._super(obj);
    },
    _addControls: function () {
        this.addDelete();
        this.addSave();
        this.obj.addRotateBase();
        this.obj.addSizeBase();
      
        this.baseEvents();
    },
    addDelete: function () {
        var _delete = this.obj.addDeleteBase();
        var self = this;
        _delete.get().on('click', function() {
            self.removeBase();
            self._l().setMask(null)
        });
    },
    addSave: function () {
        var self = this;
        var _save = this.obj.addSaveBase();
        _save.get().on('click', function () {
            self._l().getMask().eventSave.call();
        });
    }
});

var DD_control_text = DD_Control_Base_Model.extend({
    containerClass: 'dd-helper-control-text',
    
    init: function (obj) {
        this._super(obj);
    },
    
    _addControls: function () {
        this.obj.contentContainer.get().addClass(this.containerClass);
        this.addDelete();
        this.obj.addRotateBase();
        this.obj.addSizeBase();
        this.addFontSelector();
        
        this.baseEvents();
    },
    
    addFontSelector: function() {
        var self = this;
        var _selector = new DD_button({
            'parent': this.obj.buttons.get(),
            //'text': this._('save'),
            'class': 'fa fa-font'
        });
        _selector.get().on('click', function() {
            self.showTextSetting();
        });
    },
    
    showTextSetting: function() {
        var content = this.obj.content.get();
        content.empty();
        this.obj.colorSelector(content, this._('background_color'));
        this.obj.colorSelector(content, this._('text_color'));
        this.obj.fontSelector(content);
        
        this.obj.contentContainer.get().show();
    },
    
    addDelete: function() {
        var self = this;
        var _delete = this.obj.addDeleteBase();
        _delete.get().on('click', function() {
            self.removeBase();
        });
    }
})

var DD_Layer_Base = DD_object.extend({

    init: function (id) {
        this._super(id);
    },

    positionToBase: function (options, setTo) {
        var parent = this.getParent();

        switch (setTo) {
            case 'top_left':

                break;
            default:
                options = this.positionCenterCenter(parent, options);  
                break;
        }
        return options;
    },
    
    getParent: function() {
        if(this.parent) {
            return this.parent;
        }
        return this._l().getHoverCanvas();//canvas
    },
    
    positionCenterCenter: function(parent, options) {
        
        if(this._l().getMask()) {
            var mask = this._l().getMask();
            var pointCenter = mask.getCenterPoint();
            options.left = (pointCenter.x) - ((options.width)/2);
            options.top = (pointCenter.y) - ((options.height)/2); 
        }else{
            options.left = (this._l().getWidth() - options.width)/2;
            options.top = (this._l().getHeight() - options.height)/2;
        }
        options.centeredRotation = true;
        return options;
    },
    
    getAngle: function() {
        if(this._l().getMask()) {
            var angle = this._l().getMask().get('angle');
        }else{
            var parent = this.getParent();
            var angle = parent.get('angle');
        }
        return angle;
    },

    calcFontSize: function () {
        if(this._l().getMask()) {
           var width = this._l().getMask().getWidth(); 
        }else{
            var width = this._l().getWidth();
        }
        var canvas = this._l().getHoverCanvas();
        return parseInt(this._s('defaultFontSize')/canvas.getZoom()) * 
                (width / canvas.getWidth());
    },
    
    setSize: function(options, sizes, percentFromParent) {
        options.width  = this.calcObjectSize(sizes, percentFromParent).width;
        options.height = this.calcObjectSize(sizes, percentFromParent).height;
        
        return options;
    },

    calcObjectSize: function (sizes, percentFromParent) {
        var parent = this.getParent();
        if(this._l().getMask()) {
            var mask = this._l().getMask();
            var width  = mask.get('width') * mask.get('scaleX');
            var height = mask.get('height') * mask.get('scaleY');
        }else{
            var width = this._l().getWidth();
            var height = this._l().getHeight();
        }
        var newWidth = (width/100)*percentFromParent;
        if(sizes && sizes.width < newWidth) {
            return sizes;
        }
        if(sizes){
            var prop = sizes.height/sizes.width;
            var newHeight = newWidth * prop;
        }else{
            var newHeight = ( height / 100 ) * percentFromParent;
        }
        var sizes = {
            width: newWidth,
            height: newHeight
        }
        return sizes;
    },
    
    getObject: function() {
        return this.object;
    },
    
    setDeselectEvent: function() {
        this.object.on('deselected', function(e) {
            if(typeof(this.controlModelCreated)!='undefined') {
                this.controlModelCreated.hide();
            }
        });
    },
    
    setObjAngle: function(object) {
        var angle = this.getAngle();
        if(angle && !object.get('angle')) {
            object.setAngle(angle);
        }
    },
    
    onCreated: function() {
        this.setDeselectEvent();
    }
});


var DD_Layer_Img = DD_Layer_Base.extend({
    init: function (options, fullCnfg, notSelect) {
        var self = this;
        var options = options ? options : {};
        if (options.parent) {
            this.parent = options.parent;
        }
        var src = fullCnfg ? fullCnfg.src : options.src;
        fabric.Image.fromURL(src, function (iImg) {
            var parent = self.getParent()
            if (!fullCnfg) {
                var conf = {
                    hasControls: options.nocontrols ? false : true,
                    hasBorders: options.noborders ? false : true,
                    selectable: options.noselectable ? false : true,
                    controlModel: 'DD_control_image',
                    centeredScaling: true
                }
                var mask = self._l().getMask();
                var percentWidth = !mask ? self._s('defaultLayerMaskWidth') : self._s('percentSizeFromMask');
                if (!options.noChangeSize) {
                    conf = self.setSize(conf, {
                        width: options.width,
                        height: options.height
                    }, percentWidth);
                }
                if (!options.noChangeSize) {
                    conf = self.positionToBase(conf);
                }
            } else {
                var conf = fullCnfg;
            }

            conf.notSelect = notSelect;

            iImg
                    .set(conf);
            parent.add(iImg);

            if (!options.noChangeSize) {
                self.setObjAngle(iImg);
            }

            parent.renderAll();

            if (!options.noselectable && !conf.notSelect) {
                parent.setActiveObject(iImg);
            }

            self.object = iImg;
            self.onCreated();
            //self.setDeselectEvent();

        }, {crossOrigin: 'anonymous'});
    }
});


var DD_Layer_Main = DD_Layer_Base.extend({
    init: function(options) {
        fabric.Object.prototype.transparentCorners = false;
        //this._l().canvas.selection = false;
        options.nocontrols = true;
        options.noborders = true;
        options.noselectable = true;
        options.left = 0;
        options.top = 0;
        options.noChangeSize = true;
        options.parent = this._l().getBgCanvas();
        options.mainBg = true;
        new DD_Layer_Img(options);
        return;
    }
});



var DD_Layer_Mask = DD_Layer_Base.extend({

    init: function (maskOptions, notSelect) {
        if (maskOptions) {
            if (maskOptions.type == 'rect') {
                maskOptions.controlModel = 'DD_control_mask';
                return this.addRectLayer(maskOptions, notSelect);
            }
        }
        return this.addRectLayer(false, notSelect);
    },
    addRectLayer: function (conf, notSelect) {
        var parent = this.getParent();
        if (!conf) {
            var conf = {
                fill: 'white',
                opacity: 0.4,
                layerMask: true,
                controlModel: 'DD_control_mask',
                centeredScaling: true
            };

            conf = this.setSize(conf, null, this._s('defaultLayerMaskWidth'));
            conf = this.positionToBase(conf);

        }
        var rect = new fabric.Rect(conf);
        parent.add(rect);
        rect.notSelect = notSelect;
        if(!notSelect) {
            parent.setActiveObject(rect);
        }
        parent.renderAll();
        this._l().setMask(rect);
        rect.eventSave = this.save.bind(this);
        rect.eventRestore = this.restore.bind(this);
        this.object = rect;
        this.setDeselectEvent();
        
        return this;
    },

    save: function () {
        var object = this._l().getMask();
        var canvas = this._l().getHoverCanvas();
        canvas.clipTo = function (ctx) {
            var oCoords = object.oCoords;
            ctx.strokeStyle = '#ccc';
            ctx.beginPath();
            ctx.moveTo(oCoords.tl.x, oCoords.tl.y);
            ctx.lineTo(oCoords.tr.x, oCoords.tr.y);
            ctx.lineTo(oCoords.br.x, oCoords.br.y);
            ctx.lineTo(oCoords.bl.x, oCoords.bl.y);
            ctx.closePath();
            ctx.stroke();
            ctx.save();
        }
        canvas.setBackgroundColor('rgba(255, 255, 153, 0.6)');
        object.hasControls = false;
        object.selectable = false;
        if(object.controlModelCreated) {
            object.controlModelCreated.hide();
        }
        object.setOpacity(0);
        canvas.renderAll();
    },

    restore: function () {
        var object = this._l().getMask();
        var canvas = this._l().getHoverCanvas();
        canvas.clipTo = null;
        object.hasControls = true;
        object.selectable = true;
        object.setOpacity(0.4);
        canvas.setActiveObject(object);
        canvas.setBackgroundColor('transparent');
        canvas.renderAll();
    }
});

var DD_Layer_Text = DD_Layer_Base.extend({
    init: function (options, fullCnfg, notSelect) {
        console.log('notSelect: ' + notSelect);
        var parent = this.getParent();

        var options = options ? options : {};
        var text = fullCnfg ? fullCnfg.text : options.text;
        
        if (!fullCnfg) {
            var conf = {
                fontSize: this.calcFontSize(),
                fontFamily: options.fontFamily ? options.fontFamily : this._s('defaultFont'),
                fill: options.fill ? options.fill : this._s('defualtFontColor'),
                controlModel: 'DD_control_text',
                centeredScaling: true
            };
        } else {
            var conf = fullCnfg;
        }

        conf.notSelect = notSelect;
        
        var text = new fabric.Text(text, conf);
        parent.add(text);
        
        if (!fullCnfg) {
            var coords = this.positionToBase({width: text.getWidth(), height: text.getHeight()});

            text.set({
                left: parseInt(coords.left),
                top: parseInt(coords.top)
            }).setCoords();

            this.setObjAngle(text);
        }else{
            text.setCoords();
        }

        parent.renderAll();
        if (!options.noselectable && !conf.notSelect) {
            parent.setActiveObject(text);
        }
        
        this.object = text;
        this.onCreated();
    }
})

var DD_AddfromLibraryButton = DD_button.extend({
    object_id: 'dd-add-library-button',
    class_name: 'dd-add-library-controls',
    
    model: 'DD_AddFromLibrary_Model',
    
    init: function(parent) {
        var options = {
            parent: parent,
            id: this.object_id,
            class: this.class_name,
            text: this._('add_from_library'),
            windowOpener: true
        }
        this._super(options);
    }
})

var DD_AddphotoButton = DD_button.extend({
    object_id: 'dd-add-photo-button',
    class_name: 'dd-add-photo-controls',
    model: 'DD_AddPhoto_Model',
    
    init: function(parent) {
        var options = {
            parent: parent,
            id: this.object_id,
            class: this.class_name,
            text: this._('add_photo'),
            windowOpener: true
        }
        this._super(options);
    }
});

var DD_AddtextButton = DD_button.extend({
    object_id: 'dd-add-text-button',
    class_name: 'dd-add-text-controls',
    model: 'DD_AddText_Model',
    
    init: function(parent) {
        var options = {
            parent: parent,
            id: this.object_id,
            class: this.class_name,
            text: this._('add_text'),
            windowOpener: true
        }
        this._super(options);
    }
})


var DD_historyBackButton = DD_button.extend({
    object_id: 'dd-history-back-button',
    class_name: 'dd-history-controls',
    
    init: function(parent) {
        var options = {
            parent: parent,
            id: this.object_id,
            class: this.class_name,
            text: this._('back')
        }
        this._super(options);
    }
});


var DD_Historycontrols = DD_panel.extend({
    object_id: 'dd-history-controls',
    class_name: 'dd-designer-history-controls',
    
    init: function (parent) {
        this.parent = parent;
        this._super({
            'id': this.object_id,
            'class': this.class_name,
            'parent': parent
        });
        this.add();
    },
    
    _addElements: function() {
        this.addBackButton();
        this.addNextButton();
    },
    
    addNextButton: function() {
        new DD_historyNextButton(this.self);
    },
    
    addBackButton: function() {
        new DD_historyBackButton(this.self);
    }
});

var DD_historyNextButton = DD_button.extend({
    object_id: 'dd-history-next-button',
    class_name: 'dd-history-controls',
    
    init: function(parent) {
        var options = {
            parent: parent,
            id: this.object_id,
            class: this.class_name,
            text: this._('next')
        }
        this._super(options);
    }
});



var DD_layerButton = DD_button.extend({
    object_id: 'dd-main-layer-button',
    class_name: 'dd-main-button',
    
    init: function(parent) {
        var options = {
            parent: parent,
            id: this.object_id,
            class: this.class_name,
            text: this._('layers')
        }
        this._super(options);
    }
});


var DD_main = DD_panel.extend({
    object_id: 'dd-main-panel',
    class_name: 'dd-designer-container clearfix',
    model: 'DD_Main_Model',

    init: function (parent, options) {
        var self = this;
        this.options = options;
        this._super({
            'id': this.object_id,
            'class': this.class_name,
            'parent': parent
        });
    },
    
    create: function() {
        return this.add();
    },
    
    _addElements: function() {
        new DD_Topcontrols(this.self);
        if(this._s('history')) {
            new DD_Historycontrols(this.self);
        }
        new DD_Maincontrols(this.self);
        new DD_setup(this.getParent(), this.options);
    }
});

var DD_Maincontrols = DD_panel.extend({
    object_id: 'dd-main-controls',
    class_name: 'dd-designer-maincontrols',

    init: function (parent) {
        this.parent = parent;
        this._super({
            'id': this.object_id,
            'class': this.class_name,
            'parent': parent
        });
        this.add();
    },

    _addElements: function () {
        this.addLayersButton();
        this.addSaveButton();
        this.addQRCodeButton();
        this.addPreviewButton();
    },
    
    addLayersButton: function() {
        if(!this._s('layers')) {
            return;
        }
        new DD_layerButton(this.self);
    },
    
    addSaveButton: function() {
        if(!this._s('save')) {
            return;
        }
        new DD_saveButton(this.self);
    },
    
    addQRCodeButton: function() {
        if(!this._s('qrcode')) {
            return;
        }
        new DD_qrButton(this.self);
    },
    
    addPreviewButton: function() {
        if(!this._s('preview')) {
            return;
        }
        new DD_previewButton(this.self);
        
    }
});

var DD_previewButton = DD_button.extend({
    object_id: 'dd-main-preview-button',
    class_name: 'dd-main-button',
    
    init: function(parent) {
        var options = {
            parent: parent,
            id: this.object_id,
            class: this.class_name,
            text: this._('preview')
        }
        this._super(options);
    }
});


var DD_qrButton = DD_button.extend({
    object_id: 'dd-main-qrcode-button',
    class_name: 'dd-main-button',
    
    init: function(parent) {
        var options = {
            parent: parent,
            id: this.object_id,
            class: this.class_name,
            text: this._('add_qrcode')
        }
        this._super(options);
    }
});


var DD_saveButton = DD_button.extend({
    object_id: 'dd-main-save-button',
    class_name: 'dd-main-button',

    init: function (parent) {
        var options = {
            parent: parent,
            id: this.object_id,
            class: this.class_name,
            text: this._('save')
        }
        this._super(options);
    }
});


var DD_Topcontrols = DD_panel.extend({
    object_id: 'dd-top-controls',
    class_name: 'dd-designer-topcontrols',
    
    init: function (parent) {
        this.parent = parent;
        this._super({
            'id': this.object_id,
            'class': this.class_name,
            'parent': parent
        });
        this.add();
    },
    
    _addElements: function() {
        this.addPhotoButton();
        this.addTextButton();
        this.addFromLibraryButton();
    },
    
    addPhotoButton: function() {
        if(!this._s('addphoto')) {
            return;
        }
        new DD_AddphotoButton(this.self);
    },
    
    addTextButton: function() {
        if(!this._s('addtext')) {
            return;
        }
        new DD_AddtextButton(this.self);
    },
    
    addFromLibraryButton: function(){
        if(!this._s('addfromlibrary')) {
            return;
        }
        new DD_AddfromLibraryButton(this.self);
    }
    
});

var DD_windowPhotoTabs = DD_Tabs.extend({
    object_id: 'dd-add-photo-tabs',
    model: 'DD_AddPhoto_Model',
    
    init: function(parent) {
        var options = {
            parent: parent,
            id: this.object_id,
            tabs: this.getTabs()
        }
        this._super(options);
    },
    getTabs: function() {
        return [
            {
                id: 'dd-add-photo-tab',
                text: this._('upload')
            },
            {
                id: 'dd-my-photo-tab',
                text: this._('my_photos')
            }
        ];
    }
});


var DD_windowTextForm = DD_panel.extend({
    object_id: 'dd-add-text-form',
    
    init: function(parent) {
        var options = {
            parent: parent,
            id: this.object_id
        }
        this._super(options);
        this.add();
    },
    
    _addElements: function() {
        this.addTextArea();
        this.addSaveButton();
    },
    
    addTextArea: function() {
        this.textArea = $('<textarea />').attr('class', 'dd-add-text-textarea');
        this.self.append(this.textArea);
    },
    
    addSaveButton: function() {
        new DD_button({
            'id': 'dd-add-text-button',
            'parent': this.self,
            'text': this._('Add Text')
        });
    }
});

var DD_setup_model = DD_ModelBase.extend({

    init: function (obj) {
        this.obj = obj;
        this.imgOptions = obj.imgOptions;
        this._super();
    },

    tabActive: function (id) {
        console.log(id);
        var content = $('#content-' + id + '');
        content.html('');
        switch (id) {
            case 'dd-setup-info':
                    this.tabInfo(content);
                break;
            case 'dd-setup-layer-mask':
                    this.tabLayerMask(content);
                break;
            case 'dd-setup-layer-images':
                    this.tabImages(content);
                break;
            case 'dd-setup-layer-texts':
                    this.tabTexts(content);
                break;
                /*
            case 'dd-setup-layer-qrcode':

                break;
                */
            default: //options

                break;
        }
    },
    
    tabTexts: function(content) {
         new DD_setup_texts(content, this.imgOptions);
    },
    
    tabImages: function(content) {
        new DD_setup_images(content, this.imgOptions);
    },
    
    
    tabLayerMask: function(content) {
        new DD_setup_layer(content, this.imgOptions);
    },
    
    tabInfo: function(content) {
        new DD_setup_info(content, this.imgOptions);
    }

});

var DD_setup_images_model = DD_AddPhoto_Model.extend({
    
    init: function (obj) {
        this.obj = obj;
        this._super(obj);
    },
    
    addEditImageEvent: function(button, view) {
        view.addWindowOpenEvent(button.get(), this, this.obj.modal, this.obj.options);
    }
    
});

var DD_setup_layer_model = DD_ModelBase.extend({

    init: function (obj) {
        this.obj = obj;
        this._super();
    },

    checkedAction: function (checkbox, view) {
        view.button.get().prop('disabled', false);
    },

    uncheckedAction: function (checkbox, view) {
        view.button.get().prop('disabled', true);
    },

    addEditLayerEvent: function (button, view) {
        var self = this;
        button.get().on('click', function () {
            if (!self._l().getMask()) {
                return new DD_Layer_Mask();
            }   
            self._l().getMask().eventRestore.call();

        });
    }

});

var DD_setup_texts_model = DD_AddText_Model.extend({
    
    init: function (obj) {
        this.obj = obj;
        this._super(obj);
    },
    
    addEditTextEvent: function(button, view) {
        view.addWindowOpenEvent(button.get(), this, this.obj.modal, this.obj.options);
    }
    
});

var DD_setup = DD_panel.extend({
    object_id: 'dd-setup',
    class_name: 'dd-setup-image',
    model: 'DD_setup_model',
    
    init: function(parent, imgOptions) {
        this.parent = parent;
        this.imgOptions = imgOptions;
        this._super({
            'id': this.object_id,
            'class': this.class_name,
            'parent': parent
        });
        this.add();
    },
    
    _addElements: function() {
        new DD_setup_tabs(this.self, this.imgOptions);
    }
    
});



var DD_setup_images = DD_panel.extend({
    class_name: 'dd-setup-images',
    model: 'DD_setup_images_model',

    init: function (parent, imgOptions) {
        this.parentModel = this.model;
        this.parent = parent;
        this.imgOptions = imgOptions;
        this._super({
            'class': this.class_name,
            'parent': parent
        });
        this.add();
    },
    
    _addElements: function() {
        this.self
                .append($('<h3 />').text(this._('add_default_images')));
        this.button = new DD_button({parent: this.self, 'text': this._('add_image'), 'fa_addon': 'fa fa-image'});
    },
    
    _callBackModel: function (model) {
        model.addEditImageEvent(this.button, this);
    }
    
    
});

var DD_setup_info = DD_panel.extend({
    class_name: 'dd-setup-image-info',

    init: function (parent, imgOptions) {
        this.parent = parent;
        this.imgOptions = imgOptions;
        this._super({
            'class': this.class_name,
            'parent': parent
        });
        this.add();
        //this.addElements();
    },
    
    _addElements: function() {
        this.self
                .append($('<h3 />').text(this._('product_sku') + ': ' + this.imgOptions.sku))
                .append($('<div />').text(this._('image_src') + ': ' + this.imgOptions.src))
                .append($('<div />').text(this._('width') + ': ' + this.imgOptions.width + 'px'))
                .append($('<div />').text(this._('height') + ': ' + this.imgOptions.height + 'px'))
                .append($('<div />').text(this._('media_id') + ': ' + this.imgOptions.media_id))
                .append($('<div />').text(this._('product_id') + ': ' + this.imgOptions.product_id));
    }


});

var DD_setup_layer = DD_panel.extend({
    class_name: 'dd-setup-layer',
    model: 'DD_setup_layer_model',

    init: function (parent, imgOptions) {
        this.parentModel = this.model;
        this.parent = parent;
        this.imgOptions = imgOptions;
        this._super({
            'class': this.class_name,
            'parent': parent
        });
        this.add();
    },
    
    _addElements: function() {
        this.self
                .append($('<h3 />').text(this._('configure_layer_mask')));
        //this.checkbox = new DD_checkbox({parent: this.self, 'text': this._('enable_layer_mask'), model: this.model, view: this});
        this.button = new DD_button({parent: this.self, 'text': this._('add_layer_mask'), 'fa_addon': 'fa fa-window-restore'});
    },
    
    _callBackModel: function (model) {
        model.addEditLayerEvent(this.button, this);
    }
    
});

var DD_setup_tabs = DD_Tabs.extend({
    object_id: 'dd-setup-tabs',
    model: 'DD_setup_model',
    
    init: function(parent, imgOptions) {
        var options = {
            parent: parent,
            id: this.object_id,
            tabs: this.getTabs()
        }
        this.imgOptions = imgOptions;
        this._super(options);
    },
    getTabs: function() {
        return [
            {
                id: 'dd-setup-info',
                text: this._('info')
            },
            {
                id: 'dd-setup-layer-mask',
                text: this._('layer_mask')
            },
            {
                id: 'dd-setup-layer-images',
                text: this._('images')
            },
            {
                id: 'dd-setup-layer-texts',
                text: this._('texts')
            },
            /*
            {
                id: 'dd-setup-layer-qrcode',
                text: this._('qr_code')
            },
            */
            {
                id: 'dd-setup-options',
                text: this._('options')
            }
        ];
    }
});



var DD_setup_texts = DD_panel.extend({
    class_name: 'dd-setup-texts',
    model: 'DD_setup_texts_model',

    init: function (parent, imgOptions) {
        this.parentModel = this.model;
        this.parent = parent;
        this.imgOptions = imgOptions;
        this._super({
            'class': this.class_name,
            'parent': parent
        });
        this.add();
    },
    
    _addElements: function() {
        this.self
                .append($('<h3 />').text(this._('add_default_texts')));
        this.button = new DD_button({parent: this.self, 'text': this._('add_text'), 'fa_addon': 'fa fa-pencil'});
    },
    
    _callBackModel: function (model) {
        model.addEditTextEvent(this.button, this);
    }
    
});

$.fn.dd_productdesigner = function (options) {
    var settings = {
        'addphoto': false,
        'addtext': false,
        'addfromlibrary': false,
        'history': false,
        'layers': false,
        'save': false,
        'qrcode': false,
        'preview': false,
        'defaultFont': 'Verdana,Geneva,sans-serif',
        'defualtFontColor': '#ffffff',
        'defaultFontSize': 25,
        'listFonts': [],
        'percentSizeFromMask': 70,
        'defaultLayerMaskWidth': 40,
        'urlUploadImages': '',
        'myFilesPath': '/myfiles.php',
        'percentSizeImage': 20 //percentage size from canvas width
    };
    
    settings = $.extend(settings, options.settings);
    
    this.options = $.extend({
        'src': '',
        'debug': false,
        'width': '',
        'height': '',
        'sku': '',
        'product_id': '',
        'media_id': '',
        'group_index': '',
        'mask': '',
        'translator': {
            'back': 'Back',
            'next': 'Next',
            'add_photo': 'Add Photo',
            'add_text': 'Add Text',
            'add_from_library': 'Add from Library',
            'layers': 'Layers',
            'save': 'Save',
            'add_qrcode': 'Add QR Code',
            'preview': 'Preview',
            'loading': 'Loading',
            'add_text_to_image': 'Add text to image',
            'add_photo_to_image': 'Add photo to image',
            'upload': 'Upload',
            'my_photos': 'My Photos',
            'drop_files_or_upload': 'Click to upload',
            'uploader_error': 'Uploader Error!!!',
            'loading': 'Loading',
            'no_data': 'No Data Found',
            'delete': 'Delete',
            'save': 'Save',
            'change_size': 'Change Size',
            'rotate': 'Rotate',
            'background_color': 'Background',
            'text_color': 'Color',

            //setup
            'info': 'Image Info',
            'layer_mask': 'Layer Mask',
            'images': 'Images',
            'texts': 'Texts',
            'qr_code': 'QR Code',
            'options': 'Options',
            'image_src': 'Image src',
            'width': 'Width',
            'height': 'Height',
            'media_id': 'Media ID',
            'product_id': 'Product ID',
            'product_sku': 'Product SKU',
            'configure_layer_mask': 'Layer Mask Configuration',
            'enable_layer_mask': 'Enable Layer Mask',
            'add_layer_mask': 'Add/Edit Layer Mask',
            'add_default_images': 'Add Default Images',
            'add_image': 'Add Image',
            'add_default_texts': 'Add default texts'
        },
        //'settings': settings,
        'afterLoad': null,
        'onUpdate': null
    }, options);

    this.options.settings = settings;
    this.onUpdate = function (callback) {
        this.options.onUpdate = callback;
    }

    this.init = function () {
        new DD_Translator(this.options.translator);
        new DD_Settings(this.options.settings);
        new DD_Event();
        var main = new DD_main(this, this.options);
        var app = main.create();
        if (this.options.debug) {
            new DD_Debug(this);
        }

        this.destroy = function () {
            app.destroy();
        }

        return this;
    }

    return this;
};
})(jQuery);