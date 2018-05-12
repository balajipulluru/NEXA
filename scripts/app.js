/*
 * The MIT License
 *
 * Copyright (c) 2014, Sebastian Sdorra
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

'use strict';

angular.module('adfDynamicSample', [
    'adf','ui.router','adf.structures.base','ngMaterial',
    /*'adf.widget.clock', 'adf.widget.github', 'adf.widget.iframe','ngRoute',
    'adf.widget.linklist', 'adf.widget.markdown', 'adf.widget.news',
    'adf.widget.randommsg', 'adf.widget.version', 'adf.widget.weather','adf.widget.navigator',
    'adf.widget.AET_viewer','adf.widget.project_info','adf.widget.coverage_tracker''adf.widget.vhdl_browser',//'adf.widget.source_editor_prototype', //using ui_ace as vhdl browser
  	'adf.widget.timing_report','adf.widget.workspace_manager',
  	'adf.widget.design_intent','adf.widget.timing.table',//,'adf.widget.demo_widget'
    'adf.widget.calculator','adf.widget.Signal_ASCII_Viewer',
    'adf.widget.orion','adf.widget.Hierarchy_Browser',*/
	'adf.widget.ui_ace','adf.widget.mantis_FE',
  'adf.widget.trace_file','adf.widget.nexa_csv_viewer','adfCustom',
  'LocalStorageModule','eda-helperprefs','helper'
  ])

  .config(function(dashboardProvider,$stateProvider,$urlRouterProvider,localStorageServiceProvider,$httpProvider){
    //helper-prefs module integration
    $httpProvider.defaults.withCredentials = true;
	dashboardProvider.widgetsPath('widgets/');
	//$urlRouterProvider.otherwise('/boards/interface1');
  $urlRouterProvider.when('/boards/{sessionId}', '/boards/{sessionId}/');
    // $stateProvider
	// .state('default',{
  //        url: '/boards',
  //       templateUrl: 'partials/default.html'
	// })
  //  .state('interface', {
	// 	url:'/boards/:id?server1&desc1&stat1&server2&desc2&stat2&chip&unit&macro&run&version&dashboard',
  //       controller: 'dashboardCtrl',
  //       controllerAs: 'dashboard',
  //       templateUrl: 'partials/dashboard.html',
  //       resolve: {
  //         data: function($stateParams, storeService){
  //           return storeService.get($stateParams.id);
  //         }
  //       }
  //     })
  $stateProvider
  .state('session',{
         url: '/boards/:sessionId',
         abstract:true,
         templateUrl:'partials/navigation.html',
         controller: 'navigationCtrl',
         controllerAs : 'nav',
         resolve : {
           sessionId: function($stateParams,storeService) {
             storeService.setSessionId($stateParams.sessionId);
            //  console.log("session state "+$stateParams.sessionId);
            localStorageServiceProvider.setPrefix($stateParams.sessionId)
             return $stateParams.sessionId;
           },
          cq_info: function($stateParams, storeService){
              return storeService.loadSessionDataFromFile("consolidatedJson");
           }
         }
  })
  .state('session.default', {
    url:'/',
    templateUrl: 'partials/default.html'
  })
  .state('session.interface', {
  	    url:'/:id?server1&desc1&stat1&server2&desc2&stat2&chip&unit&macro&run&version&dashboard',
        controller: 'dashboardCtrl',
        controllerAs: 'dashboard',
        templateUrl: 'partials/dashboard.html',
        resolve: {
          data: function($stateParams, storeService){
            // console.log("session.interface state "+sessionId);
            return storeService.get($stateParams.id);
          },
          cq_info: function($stateParams, storeService){
              return storeService.loadSessionDataFromFile("consolidatedJson");
            }
          }
      })
  })

// shared model services
// Service to access inter and intra session model data.
.service('sharedModelServices', function ($rootScope,storeService) {

    var intra_aspNames = []; //intra session aspect names
    var inter_aspNames = []; //inter session aspect names

	var intra_sharedData ={}; // used as in memory object to store intra session shared data
	var inter_sharedData ={}; // used as in memory object to store inter session shared data
    var sessionId = "";

    return {
	    intra_setSharedData: function(value) {
	            intra_sharedData = value;
	    },

	    intra_getSharedData: function() {
	            return intra_sharedData;
	    },
	    inter_setSharedData: function(value) {

	            inter_sharedData = value;
	    },
	    inter_getSharedData: function() {
	            return inter_sharedData;
	    },
	    intra_setAspectNames: function(value) {
           intra_aspNames = value;
        },

        intra_getAspectNames: function() {
           return intra_aspNames;
        },

        inter_setAspectNames: function(value) {
           inter_aspNames = value;
        },

        inter_getAspectNames: function() {
          return inter_aspNames;
        },

		// Given a key, returns the value
        intra_getValue: function(key) {
          return this.getValue(intra_sharedData, key);
        },

        inter_getValue: function(key) {
          return this.getValue(inter_sharedData, key);
        },

		// Internal helper function. Should not be called from outside
        getValue: function(data, key) {
	    	var val = "Not found";
	    	for(var k in data){
          if( k == key ){
            return data[k];
          } else {
	    		var z = data[k];
	    		for(var k1 in z){
	    			if (k1 === key)	{
                return z[k1];
              }
	    			}
	    		}
	    	}
	    	return val;
        },

		// Inserts a key value pair in a given aspect
	    intra_insertKeyValue: function(aspect,key,value) {
	    	this.intra_createAspect(aspect);
	    	var x = intra_sharedData[aspect];
	    	x[key] = value;
	    	intra_sharedData[aspect] = x;
	    	storeService.writeSessionDataToFile("consolidatedJson",intra_sharedData);
			$rootScope.$broadcast(key);
        },

    // Deletes a key value pair from a given aspect
      intra_deleteKeyValue: function(aspect,key) {
        console.log("aspect,key - ",aspect,key);
        this.intra_createAspect(aspect);
        var x = intra_sharedData[aspect];
        delete x[key];
        intra_sharedData[aspect] = x;
        console.log("intra_sharedData - ",intra_sharedData);
        storeService.writeSessionDataToFile("consolidatedJson",intra_sharedData);
        $rootScope.$broadcast(key);
      },
	    inter_insertKeyValue: function(aspect,key,value) {
            this.inter_createAspect(aspect);
            var x = inter_sharedData[aspect];
            x[key] = value;
            inter_sharedData[aspect] = x;
	    	storeService.writeSharedDataToFile("consolidatedJson",inter_sharedData);
        },

        intra_createAspect: function(aspect){
          //create aspect if not already exisits
          if(intra_sharedData.hasOwnProperty(aspect) == false){
            var x = {};
            intra_sharedData[aspect] = {};
            intra_aspNames.push(aspect);
          }
        },
        inter_createAspect: function(aspect){
	    	//create aspect if not already exisits
	    	if(inter_sharedData.hasOwnProperty(aspect) == false){
	    		var x = {};
	    		inter_sharedData[aspect] = {};
	    		inter_aspNames.push(aspect);
          }
	    }

    };
  })

  // store service
  .service('storeService', function($http, $q, localStorageService){
    var sessionId = "";
    var models_to_be_updated = new Set();
    var models_to_be_deleted = new Set();
    var store_service = {
      setSessionId: function (id){
        sessionId = id;
      },
	  getSessionId: function (){
		  return sessionId;
	  },
      getAll: function(){
        console.log("getAll "+ sessionId)
        var deferred = $q.defer();
        var sessionData = localStorageService.get(sessionId);
        if(sessionData){
          var boards = [];
          var id;
          for (id in sessionData){
            if(id.indexOf("Dashboard") != -1) {
            boards.push({
              id:id,
              title:sessionData[id].title
            });
            }
          }
          deferred.resolve(boards);
        } else {
          var sessionData = {};
          $http.get('/NexaAdfModel/'+sessionId)
            .success(function(data){
              if(data){
                data.dashboards.forEach(function(data,id){
                  if(!sessionData[data.id]){
                    sessionData[data.id]={};
                  }
              });
            }
              localStorageService.set(sessionId,sessionData);
              deferred.resolve(data.dashboards);
            })
            .error(function(){
              deferred.reject();
            });
          }
        return deferred.promise;
      },//read contents from the file directly
      getFile: function(id){
        var deferred = $q.defer();
        var sessionData = localStorageService.get(sessionId);
        $http.get('/NexaAdfModel/' + sessionId + '/'+ id)
          .success(function(data){
            sessionData[id]=data;
            localStorageService.set(sessionId,sessionData);
            deferred.resolve(data);
          })
          .error(function(){
            deferred.reject();
          });
        return deferred.promise;
      },
      clear: function(){
        localStorageService.remove(sessionId);
      },
      get: function(id){
        var deferred = $q.defer();
        var sessionData = localStorageService.get(sessionId);
        if(sessionData && sessionData[id] && (Object.keys(sessionData[id]).length>0) ){
          deferred.resolve(sessionData[id]);
        } else {
          //if session data is not available, it means that there was no data on localstorage,
          if(!sessionData){
            this.getAll().then(function(data){
              store_service.getFile(id).then(function(data){
                deferred.resolve(data);
              });
            });
          }else {
            this.getFile(id).then(function(data){
              deferred.resolve(data);
            });
          }
        }
        return deferred.promise;
      },
      set: function(id, data){
        if(models_to_be_deleted.has(id)){
          models_to_be_deleted.delete(id);
          return;
        }
        models_to_be_updated.add(id);
        var sessionData = localStorageService.get(sessionId);
        if(sessionData){
          sessionData[id]=data;
        }else {
          sessionData = {};
          sessionData[id]=data;
        }
        localStorageService.set(sessionId,sessionData);
      },
      writeFile: function(id, data){
             models_to_be_updated.add(id);
       var sessionData = localStorageService.get(sessionId);
       if(sessionData){
         sessionData[id]=data;
       }else {
         sessionData = {};
         sessionData[id]=data;
       }
	     //localStorageService.set(sessionId,sessionData);
        var urlPath = '/NexaSessionModel/' + sessionId;
        var xhttp = new XMLHttpRequest();
        xhttp.open("POST", urlPath, false);
        xhttp.setRequestHeader("Content-type", "application/json");
        var t_data = {
                      data:sessionData,
                      models_changed: Array.from(models_to_be_updated)
                    };
        xhttp.send(angular.toJson(t_data));
	localStorageService.remove(sessionId);
        //$rootScope.$digest();
      },

	loadSessionDataFromFile: function(id){
        var deferred = $q.defer();
      var sessionData = localStorageService.get(sessionId);
      if(sessionData && sessionData[id]){
        deferred.resolve(sessionData[id]);
      } else {
        $http.get('/NexaIntraSessionSharedModel/' + sessionId + '/'+ id)
          .success(function(data,err){
            deferred.resolve(data);

			})
          .error(function(){
            console.log('error getting file');
            deferred.reject();

			});
      }
        return deferred.promise;
      },
	writeSessionDataToFile: function(id, data){
          models_to_be_updated.add(id);
        var sessionData = localStorageService.get(sessionId);
        if(sessionData){
          sessionData[id]=data;
        }else {
          sessionData = {};
          sessionData[id]=data;
        }
        localStorageService.set(sessionId,sessionData);
 //        console.log("intra_session 3");
	// var deferred = $q.defer();


 //        $http.post('/NexaIntraSessionSharedModel/' + sessionId + '/'+ id, data)
        //$http.post('/v1/sharedModel/' + id, data)
 //          .success(function(data){
 //            deferred.resolve();
 //          })
 //          .error(function(){
 //            deferred.reject();
 //          });
 //         console.log("intra sess 4 ",deferred.promise);
 //        return deferred.promise;
      },
	loadSharedDataFromFile: function(id){
        var deferred = $q.defer();
        $http.get('/NexaInterSessionSharedModel/' + id)
        //$http.get('/v1/sharedModel/' + id)
          .success(function(data,err){
            deferred.resolve(data);

			})
          .error(function(){
            deferred.reject();

			});

        return deferred.promise;
      },
	writeSharedDataToFile: function(id, data){
        var deferred = $q.defer();
        $http.post('/NexaInterSessionSharedModel/' + id, data)
        //$http.post('/v1/sharedModel/' + id, data)
          .success(function(data){
            deferred.resolve();
          })
          .error(function(){
            deferred.reject();
          });
        return deferred.promise;
      },
    delete: function(id){
      var sessionData = localStorageService.get(sessionId);
      if(sessionData){
        delete sessionData[id];
        localStorageService.set(sessionId,sessionData);
      }
      if(models_to_be_updated.has(id)){
        models_to_be_updated.delete(id);
      }
      models_to_be_deleted.add(id);
        var deferred = $q.defer();
        $http.delete('/NexaAdfModel/' + sessionId + '/'+ id)
          .success(function(data){
            deferred.resolve(data);
          })
          .error(function(){
            deferred.reject();
          });
        return deferred.promise;
      }
    };
    return store_service;
  })

  .controller('AppCtrl', function($scope, $http, $timeout, $mdSidenav){

	var loadSessions = function() {
		$http.get('http://edautil1.pok.ibm.com/sm/runs/shashidhar@in.ibm.com').success(function(response){

		console.log("I got the data requested");
		$scope.sessionList = response;
	});
	};

	loadSessions();

	$scope.showClient = function(session){
		//location.href = client;
		if( session.description.indexOf('Mantis') >= 0 || session.app_name.indexOf('Mantis') >= 0 ){
			window.open("Mantis/index.html?host='"+session.host+"'&domain='"+session.domain+"'&ws_port='"+session.ws_port+"'",'_blank');
		} else if( session.description.indexOf('VHDL') >= 0 || session.description.indexOf('Nav') >= 0 || session.app_name.indexOf('VHDL') >= 0 || session.app_name.indexOf('Nav') >= 0){
			window.open("Navigator/index.html?host='"+session.host+"'&domain='"+session.domain+"'&ws_port='"+session.ws_port+"'",'_blank');
		}
	};

	var loadProperties = function() {
		$http.get('../config/config.properties').success(function(properties){
			console.log('applnBanner is ', properties);
			$scope.LWBconfig = properties;
		});
	};

	loadProperties();

	$scope.toggleLeft = buildToggler('left');
    $scope.toggleRight = buildToggler('right');

    function buildToggler(componentId) {
      return function() {
        $mdSidenav(componentId).toggle();
      };
    }

    $scope.imagePath = '../images/LWB.jpg';

    $http.get('user/info')
    .then(function(data) {
      var email      = data.email
      var blueGroups = data.bg
      console.log("email -- "+email);
      console.log("blueGroups -- "+blueGroups);
    })

})

.factory('widgetDetails',function(shareData){

	var arrObjs = [];

	return {
		updatewidgetDetails : function(){
			arrObjs = [];
			var obj = shareData.postObj();
			var wTypeCountObj1 = obj.wTypeCountObj;
			var wIdTypeObj1 = obj.wIdTypeObj;

			var keys = Object.keys(wIdTypeObj1);
			var len = keys.length;
			for (var i = 0; i < len; i++) {
				  arrObjs.push({
			        key: keys[i],
			        value:wIdTypeObj1[keys[i]]
			    });
			}
        },
		fetchwidgetDetails : function(){
			return arrObjs;
		}
	};
})

.factory('widgetComm',function(){
	var obj={};
	return {
		updateObj : function(receivedObj){
	      		obj = receivedObj;

	        },
		postObj : function(){
			return obj;
		}
	};

})

.factory('shareData',function(){
//		var obj={
//				wTypeCountObj : {},
//				wIdTypeObj : {}
//		};
		var wTypeCountObj = {};
		var wIdTypeObj = {};
    var pushObj = {};
		//alert("*** app.js - shareData ***");
		return {
      pushWidNames : function(key, value) {
        pushObj[key] = value;
        var keys = Object.keys(pushObj);
        // for (var i = 0; i < keys.length; i++) {
        //   alert("Inside pushWidNames - "+keys[i] +" == "+pushObj[keys[i]] );
        // }
      },
      getWidNames : function() {
        return { pushObj : pushObj };
      },
      getWidNameCount : function(key) {
        //alert("Inside getWidNameCount - "+pushObj[key]);
        return pushObj[key];
      },
      resetWidNames : function() {
        pushObj = {};
      },
			updateObj : function(recObj1, recObj2){
		      		wTypeCountObj = recObj1;
		      		wIdTypeObj = recObj2;
		        },
			postObj : function(){
				return { wTypeCountObj : wTypeCountObj, wIdTypeObj : wIdTypeObj };
			}
		};
	})

.factory('stateContainer', function () {
	 var wIdType = {
			 targetWId: 'default',
			 targetWTitle: 'default',
			 currentWId: 'default',
			 currentWType: 'default'
        },
        intf = {
          srcIntf: 'default',
          trgIntf: 'default'
        },
        listeners = [];

    return {
        setIntf: function (obj1, obj2, obj3) {
          //alert("Inside setIntf");
          intf.srcIntf = obj1;
          intf.trgIntf = obj2;
          intf.curWid = obj3;
          angular.forEach(listeners, function (listener) {
                listener("Dashboard", intf);
            });
        },
        setState: function (obj1, obj2, obj3, obj4) {
        	//alert("Inside setState");
        	wIdType.targetWId = obj2;
        	wIdType.targetWTitle = obj1;
        	wIdType.currentWId = obj3;
        	wIdType.currentWType = obj4;

            angular.forEach(listeners, function (listener) {
                listener("Widget", wIdType);
            });
        },
        addListener: function (listener) {
        	//alert("Inside addListener");
            listeners.push(listener);
        }
    }
})
  .factory('childWindows',['$window','$rootScope', function ($window,$rootScope) {
    var childWindows = [],header = [];
    var exists = false;
    return {
      addWindow: function (s, sWin) {
        if(childWindows.length > 0){
          for(var i = 0; i < childWindows.length; i++) {
            var obj = childWindows[i];
            if(obj.scpe.definition.title === s.definition.title) {
              obj.scpe = s; obj.childWin = sWin;
              exists = true;
              break;
            } else {
              continue;
            }
          }
          if(!exists){
            childWindows.push({"scpe":s , "childWin":sWin});
          } else {
            exists = false;
          }
        } else {
          childWindows.push({"scpe":s , "childWin":sWin});
        }
        console.log("^^^ childWindows ^^^ ",childWindows);
      },
      deleteWindow: function(sWin) {
        for( var i = 0;i<childWindows.length;i++){
          var childwindow = childWindows[i]['childWin'];
          if (childwindow == sWin) {  console.log("^^ deleting child window ^^^ ");childWindows.splice(i,1); console.log("^^^ childWindows after deleting ^^^ ",childWindows);}
        }
      },
      getWindow: function() {
        return childWindows;
      },
      pushHeader: function(head, title){
        header.push({"head": head, "title":title});
      },
      getHeader: function(){
        return header;
      },
      deleteHeader: function(sHead){
        for( var i = 0;i<header.length;i++){
          var head = header[i]['head'];
          if (head == sHead) {  console.log("^^ deleting header ^^^ ");header.splice(i,1); console.log("^^^ header after deleting ^^^ ",header);}
        }
      },
      closeAllChildWindows: async function(nTab) {
        console.log("^^ closeAllChildWindows childWindows 1 ",childWindows.length, childWindows);
        if(childWindows && childWindows.length > 0){
            childWindows.forEach(function(listItem){
            //console.log("^^ closeAllChildWindows listItem ",listItem);
            var scp = listItem['scpe'];
            var childWin = listItem['childWin'];
            scp.definition.triggeredFrom="parent";
            if(childWin){
              childWin.close();
            }
            if(nTab != "noNewTab"){
              scp.definition.newTab = true;
            }
          })
        }
        console.log("^^ closeAllChildWindows - childWindows 2 ",childWindows);
        return true;
      },
      deleteAllChildWindows: function(param){
        if(childWindows && childWindows.length > 0){
          childWindows.splice(0,childWindows.length);
        }
      }
      //,
      // closeAndDeleteChildWindow: function(widgTitle){
      //   if(childWindows && childWindows.length > 0){
      //     for( var i = 0;i<childWindows.length;i++){
      //       var scp = childWindows[i]['scpe'];
      //       var childWin = childWindows[i]['childWin'];
      //       if(scp.definition.title == widgTitle){
      //         scp.definition.triggeredFrom="parent";
      //         childWin.close();
      //         childWindows.splice(i,1);
      //         scp.definition.newTab = true;
      //         break;
      //       }
      //     }
      //   }
      // }
    }
  }]
)
    .directive('resizable', function() {
        var toCall;
        function throttle(fun) {
            if (toCall === undefined) {
                toCall = fun;
                setTimeout(function() {
                    toCall();
                    toCall = undefined;
                }, 100);
            } else {
                toCall = fun;
            }
        }
      return {
        restrict: 'AE',
        link: function(scope, element, attr) {
          console.log(" attr *** ",attr);
          var flexBasis = 'flexBasis' in document.documentElement.style ? 'flexBasis' :
              'webkitFlexBasis' in document.documentElement.style ? 'webkitFlexBasis' :
              'msFlexPreferredSize' in document.documentElement.style ? 'msFlexPreferredSize' : 'flexBasis';
          var colCount = scope.$eval(attr['colCount']); console.log("colCount *** ",colCount);
          if(!colCount || colCount == 1){
            element.addClass('resizable');
          }
          var style = window.getComputedStyle(element[0], null),
            w,
            h,
            // dir = scope.rDirections,
            // vx = scope.rCenteredX ? 2 : 1, // if centered double velocity
            // vy = scope.rCenteredY ? 2 : 1, // if centered double velocity
            // inner = scope.rGrabber ? scope.rGrabber : '<span></span>',
            dir = scope.$eval(attr['rDirections']),
            vx =  1, // if centered double velocity
            vy =  1, // if centered double velocity
            inner = '<span></span>',
            start,
            dragDir,
            axis,
            flexDimen,
            grabDir,
            info = {};
          var updateInfo = function(e) {
            console.log("updateInfo *** rFlex - ",scope.$eval(attr['rFlex']));
            info.width = false; info.height = false;
            if(axis === 'x')
              //info.width = parseInt(element[0].style[scope.rFlex ? flexBasis : 'width']);
              info.width = parseInt(element[0].style[scope.$eval(attr['rFlex']) ? flexBasis : 'width']);
            else
              //info.height = parseInt(element[0].style[scope.rFlex ? flexBasis : 'height']);
              info.height = parseInt(element[0].style[scope.$eval(attr['rFlex']) ? flexBasis : 'height']);
            info.id = element[0].id;
            info.evt = e;
          };
          var dragging = function(e) {
            console.log("*** start, e.clientX, e.clientY - ",start, e.clientX, e.clientY);
            var prop, offset = axis === 'x' ? start - e.clientX : start - e.clientY;
            switch(dragDir) {
              case 'top':
                console.log("dragDir, w , offset, vx - ",dragDir, w , offset, vx);
                prop = scope.$eval(attr['rFlex']) ? flexBasis : 'height';
                element[0].style[prop] = h + (offset * vy) + 'px';
                break;
              case 'bottom':
                console.log("dragDir, w , offset, vx, element[0] - ",dragDir, w , offset, vx, element[0]);
                prop = scope.$eval(attr['rFlex']) ? flexBasis : 'height';
                if(element[0].getElementsByClassName("ace_editor").length > 0) {
                  var px_offset = 110;
                  //to accomodate hyper search results for ace_editor
                  var hyper_ace_ele = element[0].getElementsByClassName("hyper_ace")
                  if(hyper_ace_ele.length > 0) {
                    px_offset = hyper_ace_ele[0].clientHeight+110;
                  }
                  var aceEdtr = element[0].getElementsByClassName("ace_editor");
                  console.log("aceEdtr -",aceEdtr);
                  aceEdtr.item(0).style[prop] = h - (offset * vy) - px_offset + 'px';
                  flexDimen = h - (offset * vy) - px_offset;

                } else if(element[0].getElementsByClassName("vnc").length > 0) {
                  var elmVNC = element[0].getElementsByClassName("vnc");
                  var tmpFlex = h - (offset * vy);
                  //if(tmpFlex <= 720) {
                    elmVNC.item(0).style[prop] = h - (offset * vy) - 70 + 'px';
                    flexDimen = h - (offset * vy);
                  //}
                  //workaround to fix ag-grid resizing issue with flex-box
                } else if(element[0].getElementsByClassName("gridnChart").length > 0) {
                  var gridNChart = element[0].getElementsByClassName("gridnChart");
                  console.log("gridNChart -",gridNChart.item(0).children.item(0));
                  gridNChart.item(0).style[prop] = h - (offset * vy) - 110 + 'px';
                  flexDimen = h - (offset * vy) - 110;
                  //workaround to fix ag-grid resizing issue with flex-box - End
                  //Vertical Resize fix for mantisLogs - Start
                } else if(element[0].getElementsByClassName("mantisLogs").length > 0) {
                  var mantisLogs = element[0].getElementsByClassName("mantisLogs");
                  console.log("mantisLogs -",mantisLogs.item(0).children.item(0));
                  mantisLogs.item(0).style[prop] = h - (offset * vy) - 110 + 'px';
                  flexDimen = h - (offset * vy) - 110;
                  //Vertical Resize fix for mantisLogs - End
                } else {
                  element[0].style[prop] = h - (offset * vy) + 'px';
                }
                console.log("flexDimen -",flexDimen);
                break;
              case 'right':
                console.log("dragDir, w , offset, vx - ",dragDir, w , offset, vx);
                prop = scope.$eval(attr['rFlex']) ? flexBasis : 'width';
                element[0].style[prop] = w - (offset * vx) + 'px';
                //workaround to fix ag-grid resizing issue with flex-box
                var elems = document.getElementsByClassName('ag-bl-full-height-center');
                for (var index = 0; index < elems.length; index++) {
                  elems[index].style.removeProperty('width');
                }
                break;
              case 'left':
                console.log("dragDir, w , offset, vx - ",dragDir, w , offset, vx);
                prop = scope.$eval(attr['rFlex']) ? flexBasis : 'width';
                element[0].style[prop] = w + (offset * vx) + 'px';
                break;
            }
            console.log("*** prop - "+prop);
            updateInfo(e);
            throttle(function() { scope.$emit('angular-resizable.resizing', info);});
          };
          var dragEnd = function(e) {
            console.log("dragEnd - ");

            //Save the widget Dimensions on drag end - Start
            var width = element[0].offsetWidth;
            var height = element[0].offsetHeight;
            console.log("info.width - info.height - Width - height -",info.width, info.height, width, height);
            if(grabDir === "right") {
              console.log("grabDir  - ",grabDir);
              scope.column['widgWidth'] = element[0].offsetWidth;
             //   document.getElementById("vnc").style.pointerEvents = "all";
            } else if(grabDir === "bottom") {
              if(flexDimen < 0 ) flexDimen = 0;
              console.log("grabDir  - ",grabDir, flexDimen);
              scope.definition['widgHeight'] = flexDimen;
            }
            //Save the widget Dimensions on drag end - End

            updateInfo();
            scope.$emit('angular-resizable.resizeEnd', info);
            scope.$apply();
            document.removeEventListener('mouseup', dragEnd, false);
            document.removeEventListener('mousemove', dragging, false);
            element.removeClass('no-transition');
          };
          var dragStart = function(e, direction) {
            console.log("dragStart ** e, direction, style - ",e,direction, style);
            dragDir = direction;
            axis = dragDir === 'left' || dragDir === 'right' ? 'x' : 'y';
            start = axis === 'x' ? e.clientX : e.clientY;
            w = parseInt(style.getPropertyValue('width'));
            h = parseInt(style.getPropertyValue('height'));
            console.log("dragStart ** w, h, start - ",w, h, start);
            document.addEventListener('mouseup', dragEnd, false);
            document.addEventListener('mousemove', dragging, false);
            if(e.stopPropagation) e.stopPropagation();
            if(e.preventDefault) e.preventDefault();
            e.cancelBubble = true;
            e.returnValue = false;
            updateInfo(e);
            scope.$emit('angular-resizable.resizeStart', info);
            scope.$apply();
          };
          dir.forEach(function (direction) {
            console.log("dir.foreach *** ",direction);
            grabDir = direction
            var grabber = document.createElement('div');
            grabber.setAttribute('class', 'rg-' + direction);
            //grabber.setAttribute('onmousedown', disableIframeMousePointer());
            grabber.innerHTML = inner;
            element[0].appendChild(grabber);
            grabber.ondragstart = function() { return false; };
            grabber.addEventListener('mousedown', function(e) {
              if(document.getElementsByClassName("vnc")){
                var vncSes = document.getElementsByClassName("vnc");
                for(var i = 0; i < vncSes.length; i++)
                {
                   vncSes.item(i).style.pointerEvents = "none";
                }
              }
                if (e.which === 1) {
                  dragStart(e, direction);
              }
            }, false);
            document.addEventListener('mouseup', function(e) {
              if(document.getElementsByClassName("vnc")){
                var vncSes = document.getElementsByClassName("vnc");
                for(var i = 0; i < vncSes.length; i++)
                {
                   vncSes.item(i).style.pointerEvents = "all";
                }
              }
            }, false);
          });
        }
      };
    })

.service('checkChildService', function(){

  this.getmodel = function(scope)
  {
    if(scope.$parent.$parent.$parent.parentScope)
    {
      return scope.$parent.$parent.$parent.parentScope.$parent.$parent.adfModel;
    } else {
      return scope.$parent.$parent.$parent.$parent.adfModel;
    }
  }

  this.getWidtype =  function(scope){
      return scope.$parent.$parent.definition.type;
  }

});
