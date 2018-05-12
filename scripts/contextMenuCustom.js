//Custom file to handle Context Menu events

angular.module('contextMenuCustom',['adf.provider'])
// Bind to the document's Right Click event to get the current clicked Widget Id and Widget Type .
  .directive('ngRightClick', function($parse) {
    return function(scope, element, attrs) {
        var fn = $parse(attrs.ngRightClick);
        element.bind('contextmenu', function(event) {
            scope.$apply(function() {
                event.preventDefault();
                fn(scope, {$event:event});
            });
        });
    };
  })
  .controller('commonController', function($scope, stateContainer, widgetDetails, getWidgetInfo){
    var currentWId = "",
    currentWType = "",
    srcItnf = "";
    $scope.actions = [];
    $scope.intfs = [];

 
    $scope.getWidgInfo = function(event) {
      //alert("Inside contextMenuCustom.getWidgInfo");
      

      getWidgetInfo.getWidgetId(event);
      var obj = getWidgetInfo.postWidgetInfo();
      
      currentWId = obj.currentWId;
      currentWType = obj.currentWType;
      $scope.actions = obj.actions;
      $scope.intfs = obj.intfs;
      srcItnf = obj.srcItnf;
      //alert("Inside contextMenuCustom.getWidgInfo - currentWId - "+currentWId+" - currentWType - "+currentWType+" - actions - "+$scope.actions+" - $scope.intfs - "+$scope.intfs);
    };

	  //Context Menu onclick function to update the listener with target Widget Details 
    $scope.readMessage = function(wName,wId) {
		//alert('Target widget - "'+wName+'" with Id "'+wId+'"');
		stateContainer.setState(wName,wId,currentWId,currentWType);
  	};
    $scope.moveToInterface = function(trgIntf) {
      //alert('Target Interface - "'+trgIntf);
      stateContainer.setIntf(srcItnf, trgIntf, currentWId);
    };
  })
  .factory('widgetFunctions', function(widgetDetails, storeService){

  	function findUpTag(el, attr) {
    while (el.parentNode) {
        el = el.parentNode;
        if (el.hasAttribute(attr))
            return el;
    }
    return null;
}
    function findAncestor (el, cls) {
      while ((el = el.parentElement) && !el.classList.contains(cls));
      return el;
    }
    return {
      getSrcIntf : function(evt) {
        var tempEle = evt.target;
        var parentIntf = findAncestor(tempEle, "dashboard-container");
        return parentIntf.getAttribute("name");
      },
      getSrcWid : function(evt){
        var tempEle = evt.target;
        return findUpTag(tempEle, "adf-id");        
      },
      getAllWidgsOnMiniTab : function(){
        // Get all the widgets on the current Interface/minitab
        widgetDetails.updatewidgetDetails();
        return widgetDetails.fetchwidgetDetails();
      },
      getConfigVars : function(srcResponse) {
          var varSrcInt = new Object();
          var retObj = new Object();
          varSrcInt = srcResponse;
          var rowLength= varSrcInt.rows.length;
          for (var rowIndex = 0; rowIndex < rowLength; rowIndex++) {
            var colLength= varSrcInt.rows[rowIndex].columns.length;
            for (var colIndex = 0; colIndex < colLength; colIndex++) {
              var srcWidgets = varSrcInt.rows[rowIndex].columns[colIndex].widgets;
              for(var k=0;k<srcWidgets.length;k++){
                if(srcWidgets[k].type == "Hierarchy_Browser"){
                  retObj = srcWidgets[k].config;
                  console.log("object keys from getConfigVars - "+Object.keys(retObj));
                  return retObj;
                }
              }
            }
          }
        }        
      } 
    })
  .factory('getWidgetInfo', function(widgetDetails, storeService, widgetFunctions){
    var currentWId = "",
    currentWType = "",
    parentInterface = "",
    actions = [],
    intfs = [];
    return {
      getWidgetId : function($event){ 
        //alert("In FACTORY -- getWidgetInfo");
        actions = [];
        intfs = [];
        // Get all the widgets on the current Interface
        //widgetDetails.updatewidgetDetails();
        var widDetails = widgetFunctions.getAllWidgsOnMiniTab();
        var srcWidget = widgetFunctions.getSrcWid($event);
        currentWId = srcWidget.getAttribute("adf-id");
        currentWType = srcWidget.getAttribute("adf-widget-type");
        parentInterface = widgetFunctions.getSrcIntf($event);
        // Get all the available interfaces and the current Interface
        storeService.getAll().then(function(data){
          //alert("Inside storeService of getWidgetInfo - parentInterface - "+parentInterface);
          for(var i=0; i<data.length; i++) {
            //alert("Inside storeService of getWidgetInfo -data["+i+"].title - "+data[i].title);
            if(parentInterface.toLowerCase().replace(/\s/g,'') != (data[i].id).toLowerCase().replace(/\s/g,'')) {
              intfs.push({
                key: data[i].id,
                value: data[i].title
  });
            }
          }
           //alert("In FACTORY -- getWidgetInfo - parentInterface - "+parentInterface+" - intfs - "+intfs);
        });
        widDetails.forEach( function (arrObj)
        {
           ////alert("inside Tracefile.js - Key -- "+arrObj.key+" - value - "+arrObj.value);
           if(arrObj.value != currentWId){
             //$scope.actions.push(arrObj);
             actions.push(arrObj);
           }
        });
        //alert("In FACTORY -- getWidgetInfo - currentWId - "+currentWId+" - currentWType - "+currentWType+" - actions - "+actions);
      },  
      postWidgetInfo : function(){
        //alert("In FACTORY -- postWidgetInfo");
        return { currentWId : currentWId, currentWType : currentWType, actions : actions, srcItnf : parentInterface, intfs : intfs};
      }
    };
});