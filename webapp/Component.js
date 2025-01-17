sap.ui.define([
    "sap/ui/core/UIComponent",
    "com/zfidegerleme/model/models",
    "sap/m/MessagePopover",
	"sap/m/MessageItem",
	"sap/ui/core/message/ControlMessageProcessor",
	"sap/ui/core/routing/HashChanger"
], (UIComponent, models, MessagePopover, MessageItem, ControlMessageProcessor, HashChanger) => {
    "use strict";

    return UIComponent.extend("com.zfidegerleme.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            this._initMessageManager();

			// reset the routing hash
			HashChanger.getInstance().replaceHash("");

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // enable routing
            this.getRouter().initialize();

            this.setUiModel();
        },

        _initMessageManager: function () {
			//Initialize the message processor and message manager
			this._messageManager = sap.ui.getCore().getMessageManager();
			this._messageManager.registerMessageProcessor(new ControlMessageProcessor());
			this.setModel(this._messageManager.getMessageModel(), "message");

			this._formMessagePopover = new MessagePopover({
				items: {
					path: "message>/",
					template: new MessageItem({
						description: "{message>description}",
						type: "{message>type}",
						title: "{message>message}"
					})
				}
			});
			this._formMessagePopover.setModel(this._messageManager.getMessageModel(), "message");
		},

        setUiModel: function () {
			var uiData = {
                data:[]
			};
			this.getModel("ui").setSizeLimit(999999);
			this.getModel("ui").setData(uiData);
		}
    });
});