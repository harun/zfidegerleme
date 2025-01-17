sap.ui.define([
  'com/zfidegerleme/controller/BaseController',
], (BaseController) => {
  "use strict";

  return BaseController.extend("com.zfidegerleme.controller.S1", {
      onInit() {

      let btMessagePopover = 	this.getView().byId("btMessagePopover").getId();
			this.getModel("ui").setProperty("/btMessagePopover", btMessagePopover);
      }
  });
});