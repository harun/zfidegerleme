sap.ui.define([
	"jquery.sap.global",
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"sap/ui/Device",
	"sap/m/MessageToast",
	"sap/m/MessageBox",	
	"sap/ui/core/message/Message",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	
], function (jQuery, Controller, History, Device, MessageToast, MessageBox, Message, Filter, FilterOperator) {
	"use strict";

	return Controller.extend("com.zfidegerleme.controller.BaseController", {
		
		/**
		 * Event handler  for navigating back.
		 * It checks if there is a history entry. If yes, history.go(-1) will happen.
		 * If not, it will replace the current entry of the browser history with the master route.
		 * @public
		 */
		onNavBackx: function () {
			// in some cases we could display a certain target when the back button is pressed
			if (this._oDisplayData && this._oDisplayData.fromTarget) {
				this.display(this._oDisplayData.fromTarget);
				delete this._oDisplayData.fromTarget;
				return;
			}

			var oHistory = History.getInstance();
			var sPreviousHash = oHistory.getPreviousHash();

			if (sPreviousHash !== undefined) {
				// The history contains a previous entry
				//window.history.go(-1);
				this.historyGo(-1);
			} else {
				//this.getRouter().navTo("welcome", false);
				this.navTo("Master", false);
			}
		},

		onNavBack: function () {
			this.getRouter().navTo("Master", {}, true);
		},

		/**
		 * Event handler for navigating to defined route.
		 * You have to define a custom data route name property
		 * e.g. XMLView -> data:routeName="routeName"
		 * e.g. JSView  -> customData : [{ key : "routeName", value : "routeName" }]
		 *
		 * @param {sap.ui.base.Event} oEvent - the navigate to event.
		 * @returns {undefined} undefined
		 * @public
		 */
		onNavTo: function (oEvent) {
			var oItem = oEvent.getParameter("listItem") || oEvent.getParameter("item") || oEvent.getSource(),
				sRouteName = oItem.data("routeName") || oItem.data("route"),
				oRouteConfig = oItem.data("routeConfig") || {},
				sUrl = oItem.data("url") || undefined;

			// route handling
			if (sRouteName) {
				// nav to with history
				this.navTo(sRouteName, oRouteConfig, false);
			} else if (sUrl && sUrl.length > 0) {
				//window.open(sUrl);
				sap.m.URLHelper.redirect(sUrl, true);
			}
		},

		/* =========================================================== */
		/* public methods                                              */
		/* =========================================================== */

		getComponent: function () {
			return sap.ui.core.Component.getOwnerComponentFor(
				this.getView()
			);
		},

		/**
		 * Convenience method for getting the view model by name in every controller of the application.
		 * @public
		 * @param {string} sName the model name
		 * @returns {sap.ui.model.Model} the model instance
		 */
		getModel: function (sName) {
			// return this.getView().getModel(sName);
			return this.getOwnerComponent().getModel(sName);
		},

		/**
		 * Convenience method for setting the view model in every controller of the application.
		 * @public
		 * @param {sap.ui.model.Model} oModel the model instance
		 * @param {string} sName the model name
		 * @returns {sap.ui.mvc.View} the view instance
		 */
		setModel: function (oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		/**
		 * Convenience method for getting the resource bundle.
		 * @public
		 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
		 */
		getResourceBundle: function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		/**
		 * Convenience method for accessing the router in every controller of the application.
		 * @public
		 * @returns {sap.ui.core.routing.Router} the router for this component
		 */
		getRouter: function () {
			// return this.getOwnerComponent().getRouter();
			return sap.ui.core.UIComponent.getRouterFor(this);
		},

		/**
		 * Convenience method for getting the resource bundle text.
		 * @public
		 * @param {string} sKey  the property to read
		 * @param {string[]} aArgs? List of parameters which should replace the place holders "{n}" (n is the index) in the found locale-specific string value.
		 * @returns {sap.ui.core.routing.Router} the router for this component
		 */
		getText: function (sKey, aArgs) {
			return this.getResourceBundle().getText(sKey, aArgs);
		},

		display: function (sRoute, mData) {
			// navigate to event target
			this.getRouter().getTargets().display(sRoute, mData);
		},

		historyGo: function (iSteps) {
			// navigate to event target
			window.history.go(iSteps);
		},

		navTo: function (sRoute, mData, bReplace) {
			// navigate to event target
			this.getRouter().navTo(sRoute, mData, bReplace);
		},

		handleAddButtonPress: function (oEvent) {},

		onPressGoHome: function (oEvent) {
			debugger;
			//this.getRouter().navTo(sRoute, mData, bReplace);
			this.navTo("Master", {}, false);
		},

		onCloseDialog: function (oEvent) {
			oEvent.getSource().getParent().close();
		},

		getFragment: function (fragment) {
			return _fragments[this.getView().getId() + "-" + fragment];
		},

		getContentDensityClass: function () {
			if (this._sContentDensityClass === undefined) {
				// check whether FLP has already set the content density class; do nothing in this case
				// eslint-disable-next-line sap-no-proprietary-browser-api
				if (document.body.classList.contains("sapUiSizeCozy") || document.body.classList.contains("sapUiSizeCompact")) {
					this._sContentDensityClass = "";
				} else if (!Device.support.touch) { // apply "compact" mode if touch is not supported
					this._sContentDensityClass = "sapUiSizeCompact";
				} else {
					// "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
					this._sContentDensityClass = "sapUiSizeCozy";
				}
			}
			return this._sContentDensityClass;
		},

		showBusy: function () {
			sap.ui.core.BusyIndicator.show(0);
		},

		hideBusy: function () {
			sap.ui.core.BusyIndicator.hide(0);
		},

		addMessage: function (text, type, desc) {
			var msg = new Message({
				message: text,
				type: type,
				description: desc
			});
			this.getOwnerComponent()._messageManager.addMessages(msg);
		},

		_showMesageBar: function () {
			debugger;
			let btMessagePopover = this.getModel("ui").getProperty("/btMessagePopover");
			let message = this.getModel("message").getData().length;
			if (message) {
				setTimeout(() => {
					sap.ui.getCore().byId(btMessagePopover).firePress();
				}, 500)
			}
		},

		
		clearMessages: function (oEvent) { // todo
			this.getOwnerComponent()._messageManager.removeAllMessages();
		},

		
		onMessagePopoverPress: function (evt) {
			this.getOwnerComponent()._formMessagePopover.toggle(evt.getSource());
		},

		messagePopoverType: function (msg) {}, // todo

		

	});

});