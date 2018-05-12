	angular.module('adfCustom',['adf', 'adfDynamicSample','wbManagerIntegration','ngMaterial'])
.value('rowTemplate', '<adf-dashboard-row row="row" adf-model="adfModel" options="options" edit-mode="editMode" ng-repeat="row in column.rows" />')
.config(function($provide){
	$provide.decorator('adfDashboardColumnDirective',function ($delegate, $log, $compile, $rootScope, adfTemplatePath, rowTemplate, dashboard){
		var directive =$delegate[0];
		console.log("*** inside adfDashboardColumnDirective 1");
		var link = function myLinkOverride(scope, element) {
	        var col = scope.column;
	        if (!col.cid){
	          col.cid = dashboard.id();
	        }
	        console.log("*** col - ",col);

	        if (angular.isDefined(col.rows) && angular.isArray(col.rows)) {
	          $compile(rowTemplate)(scope, function(cloned) {
	            element.append(cloned);
	          });
	        }
	        console.log("*** inside adfDashboardColumnDirective 2");
	    }
		directive.compile = function() {
	      return function(scope, element) {
	        link.apply(this, arguments);
	      };
	    };
		var controllerName = directive.controller;
		console.log("*** inside adfDashboardColumnDirective 3");
		directive.templateUrl = 'customDashboardColumn.html';
		return $delegate;
	})
})
.config(function($provide){ //config to set custom options on adf
	$provide.decorator('adfDashboardDirective',function($log,$uibModal, childWindows, $mdDialog, $delegate, $rootScope, $controller, shareData, sharedModelServices, storeService, $location, dashboard, adfTemplatePath){
		var directive =$delegate[0];

		var link = function myLinkFnOverride(scope, element, attrs) {
			// pass options to scope
	        var options = {
				name: attrs.name,
				editable: true,
				enableConfirmDelete: true,//stringToBoolean($attr.enableconfirmdelete),

				maximizable: true,//stringToBoolean($attr.maximizable),
				collapsible: true//stringToBoolean($attr.collapsible)
	        };
	        if (angular.isDefined(attrs.editable)){
	          options.editable = stringToBoolean(attrs.editable);
	        }
	        scope.options = options;

	        scope.$on('widgetChangesApplied', function() {
	        	console.log("in adfDashboardDirective - name - "+scope.name+" - model - "+scope.model);
	        	$rootScope.$broadcast('adfDashboardChanged', scope.name, scope.model);
		      });
			element.on('$destroy', function() {
				console.log("adf instance being destoryed");
        		$rootScope.$broadcast('adfDashboardChanged', scope.name, scope.model);
		  	});
	    }
	    directive.compile = function() {
	      return function(scope, element, attrs) {
	        link.apply(this, arguments);
	      };
	    };

		var controllerName = directive.controller;
		directive.templateUrl = 'partials/customDashboard.html';
		// *** Fetching all the widgets info on each Interface - Balaji Pulluru - Start
		directive.controller = function($scope,$window) {
			angular.extend(this,$controller(controllerName, {$scope: $scope}));
			var model = {};
	        var structure = {};
	        var widgetFilter = null;
	        var structureName = {};
	        var name = $scope.name;
	        $scope.hasWidgets = false;
			model = $scope.adfModel;
	        model.titleTemplateUrl = 'partials/customDashboardTitle.html';
	        // Watching for changes on adfModel
	        $scope.$watch('adfModel', function(oldVal, newVal) {
	      	  //alert("Inside $watch adfCustom");
	          // has model changed or is the model attribute not set
	          if (newVal !== null || (oldVal === null && newVal === null)) {
	            model = $scope.adfModel;
	            widgetFilter = $scope.adfWidgetFilter;
	            if ( ! model || ! model.rows ){
	              structureName = $scope.structure;
	              structure = dashboard.structures[structureName];
	              if (structure){
	                if (model){
	                  model.rows = angular.copy(structure).rows;
	                } else {
	                  model = angular.copy(structure);
	                }
	                model.structure = structureName;
	              } else {
	                $log.error( 'could not find structure ' + structureName);
	              }
	            }
	            if (model) {
	              if (!model.title){
	                model.title = 'Dashboard';
	              }
	              if (!model.titleTemplateUrl) {
	                model.titleTemplateUrl = adfTemplatePath + 'dashboard-title.html';
	              }
	              $scope.model = model;
	            } else {
	              $log.error('could not find or create model');
	            }
	          }
	          var wTypeCountMap = new Map();
	          var wTypeCount = new Object();
	          var wIdType = new Object();


	          var cou = 0;
			if(model && model.rows){
	          for (var i=0; i<model.rows.length; i++){
	              var row = model.rows[i];
	              if (angular.isArray(row.columns)){
	                for (var j=0; j<row.columns.length; j++){
	                  var col = row.columns[j];
	                  col['count']=j+1;
	                  if (col.widgets){
	                  	if (col.widgets.length > 0){
							$scope.hasWidgets = true;
						}
	                  	for (var k=0; k<col.widgets.length; k++){
	                  		var widg = col.widgets[k];
	                  		if(wTypeCountMap.has(widg.type)){
	                  			cou = wTypeCountMap.get(widg.type);
	                  			cou = cou + 1;
	                  		} else {
	                  			cou = 1;
	                  		}
	                  		col.widgets[k]['count']=k+1;

	                  		wTypeCountMap.set(widg.type,cou);

	                  		wTypeCount[widg.type]=cou;
	                  		wIdType[widg.title]=widg.wid;
								}
	                  	}
	                  }
	                }
	              }
	            }

	          shareData.updateObj(wTypeCount,wIdType);
	          //alert("* adfCustom UPdated Shared DATA *****");
	          // *** Fetching all the widgets info on each Interface - Balaji Pulluru - End
	        }, true);
			// edit mode
	        $scope.editMode = false;
	        $scope.editClass = '';
	        $scope.enableEditMode = function(){
	        	//alert("$scope.isOpen - "+$scope.isOpen);
				/******* Incrementing the Widget Name Counter for a widget Type added - Start - *******/
	        	// $rootScope.$on('updateWidNameCounter', function(event, widType, count) {
		        // 	$scope.sWidType = widType; $scope.iCount = count;
		        // })
				/******* Incrementing the Widget Name Counter for a widget Type added - End - *******/
				if(!$scope.editMode){
					$scope.editMode = true;
					if (!$scope.continuousEditMode) {
						$scope.modelCopy = angular.copy($scope.adfModel, {});
						$rootScope.$broadcast('adfIsEditMode');
					}
				}
			};

			$scope.saveEdits = function(){
				if ($scope.editMode){
					$scope.editMode = false;
					/******* Incrementing the Widget Name Counter for a widget Type added - Start - *******/
					// if($scope.sWidType && $scope.iCount) {
					// 	sharedModelServices.intra_insertKeyValue("widNameCounter",$scope.sWidType,$scope.iCount);
					// }
					/******* Incrementing the Widget Name Counter for a widget Type added - End - *******/
					var widNames = new Object();
					widNames = (shareData.getWidNames()).pushObj;
					if(widNames) {
						var keys = Object.keys(widNames);
						for (var i = 0; i < keys.length; i++) {
							//alert("inside getKeys - "+keys[i] +" == "+widNames[keys[i]] );
							sharedModelServices.intra_insertKeyValue("widNameCounter",keys[i],widNames[keys[i]]);
						}
						shareData.resetWidNames();
					}
					$rootScope.$broadcast('adfDashboardChanged', name, model);
				}
	        };
			$scope.delete = function(id){
				console.log(id);
				childWindows.closeAllChildWindows().then(function(){
				storeService.delete(id).then(function(srcResponse){
					var sessionId = window.location.href;
					var res = sessionId.split("/");
		      		sessionId = res[5];
					$location.path('/boards/'+sessionId);
					$rootScope.$broadcast('navChanged');
				})
				});
			};

			$window.onbeforeunload = function(evt) {
			// 	// $rootScope.$broadcast('adfDashboardChanged', name, model);
				sharedModelServices.intra_insertKeyValue("USER_INFO","defDashboard",name); // Retain the last closed dasboard to reopen on Parent load - Balaji Pulluru
				childWindows.closeAllChildWindows();
				console.log(name,model);
				storeService.writeFile(name, model);
				$rootScope.$digest();
			}

			$scope.hideInfo = function(){
			    var div = document.getElementById('widgInfo');
			    if(div){
			    if (div.style.display !== 'none') {
			        div.style.display = 'none';
			    }
				}
			};

		    $scope.promptRename = function(ev, intfName) {
		    	console.log("promptRename -  $scope",$scope);
				$mdDialog.show(
				{
					templateUrl: "renameDashboard.html",
					controller: RenameDashboardController,
					controllerAs: 'renmDshBrdCtrl',
					targetEvent: ev,
					locals: {param:  $scope}
				}).then(function(answer){
				});
			}

			var RenameDashboardController = function($scope, $mdDialog, $rootScope, param) {
				console.log("RenameDashboardController -  param ",param);
				var renmDshCtrl =  this;
				renmDshCtrl.dshBrdName = param.model.title;
				$scope.cancel = function() {
					$mdDialog.cancel();
				};
				$scope.renmDshBrd = function(answer){
					var result = answer.dshBrdName;
					if(result && result !="" ){
			        	storeService.get(param.model.intfId).then(function(srcResponse){
				          	if(srcResponse['title']){
					          	param.model.title = result;
					            srcResponse['title'] = result;
					            storeService.set(param.model.intfId, srcResponse);
					            	$rootScope.$broadcast('dshBrdNameChanged', result);
					            	$mdDialog.hide();
							}
						})
					}
				}
			};

		      // var confirm = $mdDialog.prompt()
		      //   .title('What would you like to name your NEXA Dashboard ?')
		      //   .placeholder('MiniTab name')
		      //   .targetEvent(ev)
		      //   .ok('OK')
		      //   .cancel('No, Thanks');
		      // $mdDialog.show(confirm).then(function(result) {
		      // 	if(result && result !="" ){
		      //   storeService.get(intfName).then(function(srcResponse){
		      //     if(srcResponse['title']){
			     //      	$scope.model.title = result;
		      //       srcResponse['title'] = result;
		      //       storeService.set(intfName, srcResponse).then(function(k) {
			            //window.location.reload(true);
				  //           childWindows.closeAllChildWindows();
			   //          var sessionId = window.location.href;
						// var res = sessionId.split("/");
			   //    		sessionId = res[5];
						// $location.path('/boards/'+sessionId);
			   //          $rootScope.$broadcast('dshBrdNameChanged', result);
			   //      })
		    //       }
		    //     })
			   //  }
		    //   });
		    // };
			/**
		    * Copy widget from old columns to the new model
		    * @param object root the model
		    * @param array of columns
		    * @param counter
		    */
		    function fillStructure(root, columns, counter) {
		      counter = counter || 0;

		      if (angular.isDefined(root.rows)) {
		        angular.forEach(root.rows, function (row) {
		          angular.forEach(row.columns, function (column) {
		            // if the widgets prop doesn't exist, create a new array for it.
		            // this allows ui.sortable to do it's thing without error
		            if (!column.widgets) {
		              column.widgets = [];
		            }

		            // if a column exist at the counter index, copy over the column
		            if (angular.isDefined(columns[counter])) {
		              // do not add widgets to a column, which uses nested rows
		              if (!angular.isDefined(column.rows)){
		                copyWidgets(columns[counter], column);
		                counter++;
		              }
		            }

		            // run fillStructure again for any sub rows/columns
		            counter = fillStructure(column, columns, counter);
		          });
		        });
		      }
		      return counter;
		    }

		    /**
		    * Read Columns: recursively searches an object for the 'columns' property
		    * @param object model
		    * @param array  an array of existing columns; used when recursion happens
		    */
		    function readColumns(root, columns) {
		      columns = columns || [];

		      if (angular.isDefined(root.rows)) {
		        angular.forEach(root.rows, function (row) {
		          angular.forEach(row.columns, function (col) {
		            columns.push(col);
		            // keep reading columns until we can't any more
		            readColumns(col, columns);
		          });
		        });
		      }

		      return columns;
		    }

		    function changeStructure(model, structure){
		      var columns = readColumns(model);
		      var counter = 0;

		      model.rows = angular.copy(structure.rows);

		      while ( counter < columns.length ){
		        counter = fillStructure(model, columns, counter);
		      }
		    }

			function createConfiguration(type){
		      var cfg = {};
		      console.log("dashboard.widgets - ",dashboard.widgets);
		      var config = dashboard.widgets[type].config;
		      if (config){
		        cfg = angular.copy(config);
		      }
		      return cfg;
		    }

		    /**
		     * Find first widget column in model.
		     *
		     * @param dashboard model
		     */
		    function findFirstWidgetColumn(model){
		      var column = null;
		      if (!angular.isArray(model.rows)){
		        $log.error('model does not have any rows');
		        return null;
		      }
		      for (var i=0; i<model.rows.length; i++){
		        var row = model.rows[i];
		        if (angular.isArray(row.columns)){
		          for (var j=0; j<row.columns.length; j++){
		            var col = row.columns[j];
		            if (!col.rows){
		              column = col;
		              break;
		            }
		          }
		        }
		        if (column){
		          break;
		        }
		      }
		      return column;
		    }

		    /**
		     * Adds the widget to first column of the model.
		     *
		     * @param dashboard model
		     * @param widget to add to model
		     * @param name name of the dashboard
		     */
		    function addNewWidgetToModel(model, widget, name){
		    	console.log("model, widget, name - ",model, widget, name);
		      if (model){
		        var column = findFirstWidgetColumn(model);
		        if (column){
		          if (!column.widgets){
		            column.widgets = [];
		          }
		          column.widgets.unshift(widget);

		          // broadcast added event
		          $rootScope.$broadcast('adfWidgetAdded', name, model, widget);
		        } else {
		          $log.error('could not find first widget column');
		        }
		      } else {
		        $log.error('model is undefined');
		      }
		    }

		    /**
		     * Checks if the edit mode of the widget should be opened immediately.
		     *
		     * @param widget type
		     */
		    function isEditModeImmediate(type){
		      var widget = dashboard.widgets[type];
		      return widget && widget.edit && widget.edit.immediate;
		    }

		    /**
		     * Opens the edit mode of the specified widget.
		     *
		     * @param dashboard scope
		     * @param widget
		     */
		    function openEditMode($scope, widget){
		      // wait some time before fire enter edit mode event
		      $timeout(function(){
		        $scope.$broadcast('adfWidgetEnterEditMode', widget);
		      }, 200);
		    }

			function copyWidgets(source, target) {
		      if ( source.widgets && source.widgets.length > 0 ){
		        var w = source.widgets.shift();
		        while (w){
		          target.widgets.push(w);
		          w = source.widgets.shift();
		        }
		      }
		    }

				$scope.$on('addNewAppInstance', function(event, name , adfModel, widgType, fileToOpen){
					console.log("name , adfModel, widgType, fileToOpen - ",name , adfModel, widgType,fileToOpen);
					var w;
					if(fileToOpen && fileToOpen.length>0)	{
						w = {
							type: widgType,
							config: createConfiguration(widgType),
							externalLaunch: fileToOpen
						};
					}	else  {
						w = {
							type: widgType,
							config: createConfiguration(widgType)
						};
					}
					addNewWidgetToModel(adfModel, w, name);
				})

	        // add widget dialog
	        $scope.addWidgetDialog = function(){
	          var addScope = $scope.$new();
	          var model = $scope.model;
	          var widgets;
	          if (angular.isFunction(widgetFilter)){
	            widgets = {};
	            angular.forEach(dashboard.widgets, function(widget, type){
	              if (widgetFilter(widget, type, model)){
	                widgets[type] = widget;
	              }
	            });
	          } else {
	            widgets = dashboard.widgets;
	          }
	          addScope.widgets = widgets;

	          // Dialog to show add widget HTML template - Balaji Pulluru
	          $mdDialog.show(
		      {
		        templateUrl: "customWidgetAdd.html",
		        scope: addScope,
		        clickOutsideToClose: false,
		        escapeToClose: false
		        //controllerAs: 'dgCtrl',
		        //locals: {param: 'showPopNotes'},
		      }).then(function(answer){
		      });
		      console.log("@@@ scope ",$scope);
	          addScope.addWidget = function(widget){
	            var w = {
	              type: widget,
	              config: createConfiguration(widget)
	            };
	            addNewWidgetToModel(model, w, name);
	            // close and destroy
	            $mdDialog.hide();
	            addScope.$destroy();

	            // check for open edit mode immediately
	            if (isEditModeImmediate(widget)){
	              openEditMode($scope, w);
	            }
	            //childWindows.closeAllChildWindows();
	            $scope.saveEdits();//Auto save the dashboard on adding an application
	   //          var sessionId = window.location.href;
				// var res = sessionId.split("/");
	   //    		sessionId = res[5];
				// $location.path('/boards/'+sessionId);
				// $rootScope.$broadcast('navChanged', $scope.adfModel.title);
	          };
	          addScope.closeDialog = function(){
	            // close and destroy
	            $mdDialog.hide();
	            addScope.$destroy();
	            $scope.editMode = false;//$scope.enableEditMode();
	          };
	        };

			// edit dashboard settings
	        $scope.editDashboardDialog = function(){
	          var editDashboardScope = $scope.$new();
	          // create a copy of the title, to avoid changing the title to
	          // "dashboard" if the field is empty
	          editDashboardScope.copy = {
	            title: model.title
	          };
	          editDashboardScope.structures = dashboard.structures;

	          // Dialog to show Edit Dashboard HTML template - Balaji Pulluru
	          $mdDialog.show(
		      {
		        templateUrl: "customDashboardEdit.html",
		        scope: editDashboardScope,
		        clickOutsideToClose: false,
		        escapeToClose: false
		      }).then(function(answer){
		      });

	          editDashboardScope.changeStructure = function(name, structure){
	            $log.info('change structure to ' + name);
	            changeStructure(model, structure);
	            childWindows.closeAllChildWindows("noNewTab");
	          };
	          editDashboardScope.closeDialog = function(){
	            // copy the new title back to the model
	            model.title = editDashboardScope.copy.title;
	            // close modal and destroy the scope
	            $mdDialog.hide();
	            editDashboardScope.$destroy();
	          };
	        };
	        $scope.$on('adfToggleEditMode', function() {
	            $scope.toggleEditMode();
	        });
		}
	    return $delegate;
	})
})
.config(function($provide){//config to have custom fullScreen functionality to save snapshot
	$provide.decorator('adfWidgetDirective',function($timeout, $q, $injector, $mdDialog, childWindows, $delegate, $controller, $uibModal, $q, $injector, $rootScope, dashboard, adfTemplatePath,wbManagerConnect,sharedModelServices, shareData,$window,$compile,$mdCompiler,$http, storeService){
		var directive = $delegate[0];

/*************************************************/
 /* Widget title updates (incrementing the count by one) - Start */
		compile = directive.compile;
        directive.compile = function (tElement, tAttrs) {
        	//alert("Inside adfCustom *1* preLink");
            var link = compile.apply(this, arguments);
            return {
                pre: function (scope, element, attr) {
                	//element[0].style['visibility']='hidden';
                    // *** Posting all the widgets info on each Interface to the ShareData factory - Balaji Pulluru - Start
					var wTypeCountObj1 = new Object();
					var wIdTypeObj1 = new Object();
					var obj = shareData.postObj();
					wTypeCountObj1 = obj.wTypeCountObj;
					wIdTypeObj1 = obj.wIdTypeObj;
					// *** Posting all the widgets info on each Interface to the ShareData factory - Balaji Pulluru - End
					var definition = scope.definition;
					console.log("definition.type, definition.widgHeight - ",definition.type, definition.widgHeight);
					if (definition) {
						var w = dashboard.widgets[definition.type];
						//console.log(" definition.title - "+definition.title);
						for (var prop in w) {
        					var key = prop, value = w[prop];
        					//console.log(" key - "+key+" - value - "+value);
        				}
						if (w) {
							if (!definition.title) {
								definition.title = w.title;
								definition.newTab = false;
								// *** Set the widget title based on existing widget count of the same widget type - Balaji Pulluru - Start
								var keys = Object.keys(wTypeCountObj1);
								for (var i = 0; i < keys.length; i++) {
									//alert("Inside adfCustom *8* preLink - keys[i] - "+keys[i]+" - value - "+wTypeCountObj1[keys[i]]);
									if( keys[i] == definition.type ){
										var wCount = 0;
										if(shareData.getWidNameCount(definition.type)){
											//alert("Inside 1");
											wCount = shareData.getWidNameCount(definition.type)+1;
										} else if(sharedModelServices.intra_getValue(definition.type) != "Not found") {
											//alert("Inside 2");
											wCount = sharedModelServices.intra_getValue(definition.type)+1;
										} else {
											//alert("Inside 3");
											wCount = wTypeCountObj1[keys[i]];
										}
										//alert("Inside 4 wCount - "+wCount);
										if(wCount!=1){
										definition.title = definition.title +" "+ (wCount);
										}
										sharedModelServices.intra_insertKeyValue("widNameCounter",definition.type,wCount);							-
										//$rootScope.$broadcast('updateWidNameCounter',definition.type,wCount);
										shareData.pushWidNames(definition.type,wCount);
										//alert("Inside adfCustom *9* preLink - definition.title - "+definition.title+" - wCount -"+wCount);
										break;
									} else {
										continue;
									}
								}
								// *** Set the widget title based on existing widget count of the same widget type - Balaji Pulluru - End
							}
						} else {
							console.log('could not find widget ' + definition.type);
						}
					} else {
						console.log('definition not specified, widget was probably removed');
					}
					// execute directive native pre
                    link.pre.apply(this, arguments);
                },
					post: function (scope, element, attr) {
						var content = element.contents();

						// var elementTypes = ['ace_editor', 'vnc', 'gridnChart'];
						// setTimeout(function(){
						// 	for (var elem of elementTypes) {
						// 		console.log("elem - ",elem);
						// 		var flexElement = element[0].getElementsByClassName(elem);
						// 		//console.log("### flexElement - ace_editor - ",flexElement, flexElement.item(0), scope.definition.widgHeight);
						// 		if(flexElement.item(0)){
						// 			flexElement.item(0).style['flexBasis'] = scope.definition.widgHeight + 'px';
						// 		}
						// 	}

						// 	element[0].style['visibility']='visible';
						// },3000);

						//$timeout( function() {
							scope.$on("widgetsLoaded",  function(event) {
								var flexElement = element[0].getElementsByClassName("appDiv");
								console.log("### flexElement - appDiv - ",flexElement, flexElement.item(0), scope.definition.widgHeight);
								if(flexElement.item(0)){
									flexElement.item(0).style['flexBasis'] = scope.definition.widgHeight + 'px';
								}
								var flexElemMantisLogs = element[0].getElementsByClassName("mantisLogs");
								console.log("### flexElemMantisLogs - mantisLogs - ",flexElemMantisLogs, flexElemMantisLogs.item(0), scope.definition.widgHeight);
								if(flexElemMantisLogs.item(0)){
									flexElemMantisLogs.item(0).style['flexBasis'] = scope.definition.widgHeight + 'px';
								}

							//}, 1000, true);
							});

						scope.customToggleEdit = function() {
							scope.editMode = ! scope.editMode;
							if (!$scope.editMode){
								$rootScope.$broadcast('adfDashboardChanged', scope.name, scope.model);
							}
							if ($scope.editMode){
					            if (!$scope.continuousEditMode) {
									$scope.modelCopy = angular.copy($scope.adfModel, {});
									$rootScope.$broadcast('adfIsEditMode');
					            }
					        }
						}

						scope.addNewAppInstance = function() {
							console.log("scope, scope.name, scope.model - ",scope, scope.name, scope.$parent.$parent.adfModel);
							var adfModel = scope.$parent.$parent.adfModel;
							var name = adfModel.title;
							var widgType = scope.definition.type;
							console.log("#### name , adfModel, widgType - ",name , adfModel, widgType);
							scope.$emit("addNewAppInstance", name , adfModel, widgType);
						}

						scope.openNewTab = function()  {
							//  console.log($element);
							// console.log( scope);
							var identifier = scope.widget.title;
							console.log("new tab",scope);
							//$scope.window = $window.open('', '_blank');
							var sessionId = $window.location.href;
							var res = sessionId.split("/");
							sessionId = res[5];
							scope.definition.newTab = true;
							// var newTabUrl = 'http://localhost:4000/partials/widgetFullTab.html' + '?' + $scope.widget.title;
							var newTabUrl = $window.location.origin + '/partials/widgetFullTab.html' + '?' + 'sessionId='+sessionId+'&widget='+scope.definition.title;
							var popWindow = $window.open(newTabUrl, '_blank');
							popWindow.parentScope = scope;


// 							scope.window = $window.open(newTabUrl, '_blank');
// 							scope.definition.openedInNewTab = true;
// 							childWindows.addWindow(scope, scope.window);
// 							$rootScope.$broadcast('widgetChangesApplied');
// 							// console.log("new window ");
// 							$window.onbeforeunload = function(){
// 								sharedModelServices.intra_insertKeyValue("USER_INFO","defDashboard",scope.options.name); // Retain the last closed dasboard to reopen on Parent load - Balaji Pulluru
// 								//var tmpChild =  childWindows.getWindow();
// 								childWindows.closeAllChildWindows();
// 								var tmpModel = scope.$parent.$parent.adfModel;
// 								var tmpName =  tmpModel.intfId;
// 								console.log("tmpModel, tmpName - ",tmpModel, tmpName);
// 								storeService.writeFile(tmpName,tmpModel);
// 								$rootScope.$digest();
// 								//scp.definition.triggeredFrom="parent";

// 							}
// 							// console.log($scope.widget);
// 							// var content = element.contents();
// 							// console.log("&&&& element.contents",content);
// 							scope.window.onload = function(){

// 							//Remove widget Header in NewTab mode -  start
// 							// var tmpele = element[0].getElementsByClassName('panel-heading');
// 							// //console.log("^^ tmpele-identifier",tmpele,identifier);
// 						 // 	   while(tmpele.length > 0){
// 						 // 	   	childWindows.pushHeader(tmpele[0], identifier);
// 						 // 	       	tmpele[0].parentNode.removeChild(tmpele[0]);
// 						 // 	   }
// 							scope.$broadcast('widgToggleHead', "");
// 							var content = element.contents();
// 							//console.log("&&&& element.contents",content);
// 							//Remove widget Header in NewTab mode -  End

// 							angular
// 								.element(scope.window.document.head)
// 								.append($window.document.head.cloneNode(true));
// 								angular
// 								.element($compile(element.clone(true,true).contents()[5])(scope))
// 								.appendTo(scope.window.document.body);
// 								// angular
// 								// .element(scope.window.document.body)
// 								// .append($compile(element.contents())(scope));
// 								 element.fadeToggle( "slow", "linear" );

// 								var sessionId = $window.location.href;
// 								sessionId = sessionId.split("/")[5];
// 								console.log(sessionId);
// 								$http.get('/session_data/' + sessionId )
// 									.success(function(data){
// 										console.log("data received");
// 										 console.log(data);
// 										scope.sessionName = data.sessionName;
// 										var temp = data.sessionName.toLowerCase()
//   										temp = temp.replace(/\s/g,'');
// 										scope.window.document.title = 'NEXA-'+ data.sessionName + " widget-"+scope.widget.title;
// 										var session_count = 0;
// 										var t= [];
// 										t = sharedModelServices.inter_getValue("sessionList");
// 										console.log("sessionList ",t);
// 										if (t === "Not found")
// 										{
// 											t = [];
// 										}
// 										for (var i=0;i<t.length;i++)
// 										{
// 											if (data.sessionName === t[i])
// 											{
// 											session_count = i + 1;
// 											}

// 										}
// 										var logo_img = scope.window.document.createElement('link');
// 										logo_img.type = 'image/x-icon';
// 										logo_img.rel = 'shortcut icon';
// 										var idx = temp.indexOf("session");
//   if(idx>=0) {
// 	session_count = temp.substring(idx+7);
//         console.log("session count",session_count);
// 	logo_img.href = '../icons/favicon_'+session_count+'.ico';
// 	scope.window.document.getElementsByTagName('head')[0].appendChild(logo_img);
//   }else{
//     console.log("hack",session_count);
//     logo_img.href = '../icons/favi_'+session_count+'.ico';
//     scope.window.document.getElementsByTagName('head')[0].appendChild(logo_img);
//   }
// 										//$scope.window.document.title = $scope.widget.title;

// 										console.log("*** scope.definition.newTab onLoad - "+scope.definition.newTab);
// 										scope.definition.newTab = true;
// 										scope.$broadcast('widgetConfigChanged');
// 										 })
// setTimeout(function(){
// 								if(scope.widget.type === "mantis") {
// 									 scope.window.document.getElementById("vnc").contentWindow.focus();
// 									//Fix for Mantis full screen - Set height to "-webkit-fill-available"
// 									scope.window.document.getElementById("vnc").style['height'] = "100vh";
// 									//Fix for Trace and SourceBrowser full screen with/without Search Results on New Tab - Start
// 								//} else if(scope.widget.type === "traceFile" || scope.widget.type === "sourceBrowser") {
// 								} else if(scope.widget.type === "traceFile") {
									
// 									if(scope.config.search_results) {
// 										scope.window.document.getElementsByClassName("ace_editor").item(0).style['height'] = "calc( 100vh - 350px )";
// 									} else {
// 										scope.window.document.getElementsByClassName("ace_editor").item(0).style['height'] = "calc( 100vh - 40px )";
// 									}
// 								}  else {
// 									scope.window.document.getElementsByClassName("ace_editor").item(0).style['height'] = "calc( 100vh - 40px )";
// 								}
// 								//Fix for Trace and SourceBrowser full screen with/without Search Results on New Tab - End
// 							},1000);

// 							//Fix for Widget full screen-Remove Padding on Panel Body element
// 							scope.window.document.getElementsByClassName("panel-body").item(0).style['padding']= "unset";
// 							}

// 							function clean_up_new_tab(){
// 							}


// 							scope.window.onbeforeunload = function () {
// 									//console.log("window destroyed");
// 								console.log("scope.definition.triggeredFrom - ",scope.definition.triggeredFrom);
// 								$rootScope.$broadcast('widgetChangesApplied');
// 								var window_ref = scope.window;
// 								//Remembering and closing widgets opened in NewTab -  start
// 								if(scope.definition.triggeredFrom != "parent"){

// 									//Retain widget Header in Parent window -  start
// 									scope.definition.openedInNewTab = false;
// 									childWindows.deleteWindow(scope.window);
// 									var d = sharedModelServices.intra_getValue("USER_PREFS");
// 									var togHead = d.toggleHeader;
// 									$rootScope.$broadcast('widgToggleHead', togHead);
// 									// var childHeader = childWindows.getHeader();
// 									// console.log("inside NOT Parent - togHead - ",togHead, childHeader.length);
// 									// for(var i=0;i<childHeader.length;i++){
// 									// 	var tmpHead = childHeader[i]['head'], tmpTitle = childHeader[i]['title'];
// 									// 	console.log("^^ tmpHead - tmpTitle -",tmpHead,tmpTitle);
// 									// 	if(scope.widget.title == tmpTitle) {
// 									// 		if(!togHead){
// 									// 			var tmpBody = element[0].getElementsByClassName("panel-body");
// 									// 			console.log("^^ newTab onbeforeunload - element[0] - tmpHead -",element[0],tmpHead);
// 									// 			element[0].prepend(tmpHead);
// 									// 			childWindows.deleteHeader(tmpHead);
// 									// 			break;
// 									// 		}
// 									// 	}
// 									// }
// 									//Retain widget Header in Parent window -  End
// 								} else if(scope.definition.triggeredFrom == "parent"){
// 									console.log("inside Parent");
// 									scope.definition.openedInNewTab = false;
// 									scope.definition.triggeredFrom = "";
// 									$rootScope.$broadcast('widgToggleHead', "");
// 								}
// 								//Remembering and closing widgets opened in NewTab -  End
// 								delete scope.window;
// 								//Unsetting newTab variable when the child alone is closed
// 								console.log("*** scope.definition.newTab onbeforeunload - "+scope.definition.newTab);
// 								scope.definition.newTab = false;
// 								element.fadeToggle( "slow", "linear" );
// 								console.log(scope);
// 								scope.$broadcast('widgetConfigChanged');
// 								angular.element(window_ref.document.body).childNodes().remove();
// 								//element.empty().append($compile(content)(scope));

// 								// console.log(content);

// 									// setTimeout(function(){
// 									// 	 $state.go($state.current, {}, {reload: true})}, 500);
// 							};

						}
						if(scope.definition.newTab == true){
							console.log("&&& calling openNewTab");
							scope.openNewTab();
						}

						scope.removeWidget= function()
						{
							console.log("element remove being called *** $scope.options.enableConfirmDelete - ",scope.options.enableConfirmDelete);
							var wid=element[0].attributes.getNamedItem('adf-id').value
							var widget_type = element[0].attributes.getNamedItem('adf-widget-type').value;
							if(widget_type=='mantis_FE'){
								console.log("calling delete for mantis");
								wbManagerConnect.deleteApplication(wid).then(function(result)
								{
									console.log(result);
								});
							} else if (widget_type == 'calculator') {
								var sessionId = window.location.href;
								var res = sessionId.split("/");
								sessionId = res[5];
								var instanceId = document.getElementById('frameUrl').src;
								var pos = instanceId.lastIndexOf('=')
								if(pos==-1) {
									pos = instanceId.lastIndexOf('/');
								}
								instanceId = instanceId.slice(pos+1,instanceId.length);
								//instanceId = instanceId.slice(instanceId.lastIndexOf('/')+1,instanceId.length);
								console.log(instanceId);
								var urlPath = 'http://localhost:5000/users/sessions/' + sessionId + '/instances/' + instanceId + '/delete';
								console.log(urlPath);
								$http({
									method: 'GET',
									url: urlPath,
								}).success(function (data, status, headers, config) {
								}).error(function (data, status, headers, config) {
								});
							} //Added to include OOTB remove functionality - Start
							if (scope.options.enableConfirmDelete) {
								var deleteScope = scope.$new();
								var definition = scope.definition;
								var deleteTemplateUrl = 'widget-delete.html';
								$mdDialog.show(
								{
									templateUrl: deleteTemplateUrl,
									scope: deleteScope,
								}).then(function(){
								});
								deleteScope.closeDialog = function() {
									$mdDialog.hide();
									deleteScope.$destroy();
								};
								deleteScope.deleteDialog = function() {
									deleteWidget();
									scope.saveEdits();
									deleteScope.closeDialog();
								};
							} else {
								deleteWidget();
							}
							var deleteWidget = function() {
								var column = scope.col;
								if (column) {
									var index = column.widgets.indexOf(definition);
									if (index >= 0) {
										column.widgets.splice(index, 1);
									}
								}
								element.remove();
								$rootScope.$broadcast('adfWidgetRemovedFromColumn');
							};
						}
						scope.widgetConfig = function() {
							var editScope = scope.$new();
							var definition = scope.definition;
							editScope.definition = angular.copy(definition);
							var adfEditTemplatePath = 'widget-edit.html';
							$mdDialog.show(
							{
								templateUrl: adfEditTemplatePath,
								scope: editScope,
							}).then(function(){
							});
							editScope.closeDialog = function() {
								$mdDialog.hide();
								editScope.$destroy();
							};
							function createApplyPromise(result){
								var promise;
								if (typeof result === 'boolean'){
									var deferred = $q.defer();
									if (result){
										deferred.resolve();
									} else {
										deferred.reject();
									}
									promise = deferred.promise;
								} else {
									promise = $q.when(result);
								}
								return promise;
							}
							editScope.saveDialog = function() {
								editScope.validationError = null;
								var widget = scope.widget;
								var applyFn = widget.edit.apply;
								var locals = {
									widget: widget,
									definition: editScope.definition,
									config: editScope.definition.config
								};
								var result = $injector.invoke(applyFn, applyFn, locals);
								createApplyPromise(result).then(function(){
									definition.title = editScope.definition.title;
									angular.extend(definition.config, editScope.definition.config);
									if (widget.edit && widget.edit.reload) {
									scope.$broadcast('widgetConfigChanged');
									}
									editScope.closeDialog();
								}, function(err){
									if (err){
										editScope.validationError = err;
									} else {
										editScope.validationError = 'Validation durring apply failed';
									}
								});
							};
						};
									link.post.apply(this, arguments);
								}
            };
        };
/* Widget title updates (incrementing the count by one) - End */
 /*************************************************/
		var controllerName = directive.controller;

		directive.controller = function($scope,$window,$state,$element,$compile,$http,sharedModelServices) {
			console.log("$scope in widgetDirectiveController - ",$scope);
			//Send http message to Workbench manager during the creation of the new widget
			//if ($scope.definition.type=="calculator")
			//Fix for Trace and SourceBrowser full screen with/without Search Results on New Tab - Start
			$scope.$on("searchFilter", function(event, exists){
				console.log("searchFilter 0 ",exists);
				if(exists){
					$scope.window.document.getElementsByClassName("ace_editor").item(0).style['height'] = "calc( 100vh - 350px )";
				} else {
					$scope.window.document.getElementsByClassName("ace_editor").item(0).style['height'] = "calc( 100vh - 40px )";
				}
			})
			//Fix for Trace and SourceBrowser full screen with/without Search Results on New Tab - End
			if($scope.definition.type=="calculator") {
				// console.log(Object.keys(app_id_map).find(key => app_id_map[key] === '58ceb8afd860fb50b4c3a395'));
				console.log("add widget " + $scope.definition.type);
				console.log(app_id_map[$scope.definition.type]);
				//var applicationId = '58ceb8afd860fb50b4c3a395'; //calculator app id as defined in WB Manager
				var applicationId = app_id_map[$scope.definition.type]
				var sessionId = window.location.href;
				// sessionId = sessionId.slice(sessionId.lastIndexOf('/')+1,sessionId.length);
				var res = sessionId.split("/");
	      sessionId = res[5];
				var urlPath = 'http://localhost:5000/users/sessions/' + sessionId + '/applications/' + applicationId;
				$http({
				 method: 'POST',
				 url: urlPath,
				 }).success(function (data, status, headers, config) {
					 	console.log(data);
						 document.getElementById('frameUrl').src = data.open;
				 }).error(function (data, status, headers, config) {
				});
			}

			angular.extend(this, $controller(controllerName, {$scope: $scope, $http: $http}));
			var d = sharedModelServices.intra_getValue("USER_PREFS");
			var togHead = d.toggleHeader;
			toggleWidgetHeader(togHead);

			$scope.$on('widgToggleHead', function(event, toggleHead){
				console.log("!!! widgToggleHead ");
		      togHead = toggleHead;
		      toggleWidgetHeader(togHead);
		    })

			function toggleWidgetHeader(togHead){
				var openedNewTab = $scope.definition.openedInNewTab;
				console.log("openedNewTab, togHead ",openedNewTab, togHead);
				if(togHead == true)	{	console.log("IF");
					$scope.definition.titleTemplateUrl = "partials/widget-header-title.html";
				} else if(togHead != true) {
					console.log("ELSE IF");
					if(openedNewTab == true){
						$scope.definition.titleTemplateUrl = "partials/widget-header-title.html";
					} else {
						$scope.definition.titleTemplateUrl = "../partials/customWidgetTitle.html";
					}
				}
				// else
				// {console.log("ELSE");
				// 	if(openedNewTab != true){
				// 		$scope.definition.titleTemplateUrl = "partials/customWidgetTitle.html";
				// 	}
				// }
			}
			/******* Decrementing the Widget Name Counter for the removed widget Type - Start - *******/
			// var definition = $scope.definition;
			// var widgCount = sharedModelServices.intra_getValue(definition.type);
			// alert("in deleteWidget - definition.type - "+definition.type+" - count - "+widgCount);
			// if(widgCount > 0) {
			// 	widgCount = widgCount - 1;
			// 	sharedModelServices.intra_insertKeyValue("widNameCounter",definition.type,widgCount);
			// }
			/******* Decrementing the Widget Name Counter for the removed widget Type - Start - *******/
			$element.on('$destroy', function() {
	      		console.log("element destroy being called");
	  		});
				 //Added to include OOTB remove functionality - End

			$scope.openFullScreen = function() {
	            var fullScreenScope = $scope.$new();
		    $scope.definition.fullScreenMode = true;
	            fullScreenScope.definition = angular.copy($scope.definition);
	            // var opts = {
	            //   scope: fullScreenScope,
	            //   template: '<form name=widgetFullScreenForm novalidate role=form ng-submit=saveDialog() ng-keyup=saveDialog() ng-mouseup=saveDialog()> <div class=modal-header style="padding-top: 7px;padding-bottom: 7px;background-color: #00B4A0;color: white;"> <div class=\"pull-right widget-icons\"> <a href title=\"Reload Widget Content\" ng-if=widget.reload ng-click=reload() style="color: #ffffff;"> <i class=\"glyphicon glyphicon-refresh\"></i> </a> <a style="color: #ffffff;" href title=close ng-click=closeDialog()> <i class=\"glyphicon glyphicon-remove\"></i> </a> </div> <h4 class=modal-title>{{definition.title}}</h4> </div> <div class=modal-body> <adf-widget-content model=definition content=widget> </adf-widget-content></div> <div class=modal-footer> <button type=button class=\"btn btn-primary\" ng-click=closeDialog()>Close</button> </div> </form>',
	            //   size: fullScreenScope.definition.modalSize || 'lg', // 'sm', 'lg'
	            //   backdrop: 'static',
	            //   //keyboard: false,
	            //   windowClass: (fullScreenScope.definition.fullScreen) ? 'dashboard-modal widget-fullscreen' : 'dashboard-modal'
	            // };
	            // var instance = $uibModal.open(opts);

				$mdDialog.show(
				{
					templateUrl: "widget-fullscreen.html",
					scope: fullScreenScope,
					clickOutsideToClose: false,
					escapeToClose: false
				}).then(function(answer){
				});


	            fullScreenScope.closeDialog = function() {
					//instance.close();
					$scope.definition.fullScreenMode = false;
					fullScreenScope.$destroy();
					fullScreenScope.saveDialog();
					//if(fullScreenScope.definition.type && fullScreenScope.definition.type == "mantis_FE"){
					//console.log("fullScreenScope function");
					$scope.$broadcast('widgetConfigChanged');
					//}
					$mdDialog.hide();
	            };

	            fullScreenScope.saveDialog = function() {
	              fullScreenScope.validationError = null;

	              // build injection locals
	              var widget = $scope.widget;
	              var applyFn = widget.edit.apply;
	              var definitionFS = fullScreenScope.definition;
	              var locals = {
	                widget: widget,
	                definition: definitionFS,
	                config: fullScreenScope.definition.config
	              };
	            //  if(definitionFS.type && definitionFS.type == "AET_Viewer"){
		              // invoke apply function and apply if success
		              var result = $injector.invoke(applyFn, applyFn, locals);
		              createApplyPromise(result).then(function(){
		            	  $scope.definition.title = fullScreenScope.definition.title;
		                angular.extend($scope.definition.config, fullScreenScope.definition.config);
		                if (widget.edit && widget.edit.reload) {
		                  // reload content after edit dialog is closed
		                  //$scope.$broadcast('widgetConfigChanged');
		                }
		              }, function(err){
		                if (err){
		                  fullScreenScope.validationError = err;
		                } else {
		                  fullScreenScope.validationError = 'Validation durring apply failed';
		                }
		              });
		              console.log("Inside adfCustom adfWidgetDirective-FullScreen - 9");
		              $rootScope.$broadcast('widgetChangesApplied');
		              console.log("Inside adfCustom adfWidgetDirective-FullScreeng - 10");
		          	// }
	            };

				function createApplyPromise(result){
	              var promise;
	              if (typeof result === 'boolean'){
	                var deferred = $q.defer();
	                if (result){
	                  deferred.resolve();
	                } else {
	                  deferred.reject();
	                }
	                promise = deferred.promise;
	              } else {
	                promise = $q.when(result);
	              }
	              return promise;
	            }
	        };

			// }
	        $scope.edit = function() {
	          var editScope = $scope.$new();
	          editScope.definition = angular.copy($scope.definition);
	          var adfEditTemplatePath = adfTemplatePath + 'widget-edit.html';
              $scope.definition.editTemplateUrl = "partials/customWidgetEdit.html";
	          if ($scope.definition.editTemplateUrl) {
	            adfEditTemplatePath = $scope.definition.editTemplateUrl;
	          }
	          var opts = {
	            scope: editScope,
	            templateUrl: adfEditTemplatePath,
	            backdrop: 'static'
	          };
	          var instance = $uibModal.open(opts);
	          editScope.closeDialog = function() {
	            instance.close();
	            editScope.$destroy();
	          };
	          function createApplyPromise(result){
	            var promise;
	            if (typeof result === 'boolean'){
	              var deferred = $q.defer();
	              if (result){
	                deferred.resolve();
	              } else {
	                deferred.reject();
	              }
	              promise = deferred.promise;
	            } else {
	              promise = $q.when(result);
	            }
	            return promise;
	          }
	          editScope.saveDialog = function() {
	            editScope.validationError = null;
	            var widget = $scope.widget;
	            var applyFn = widget.edit.apply;
	            var locals = {
	              widget: widget,
	              definition: editScope.definition,
	              config: editScope.definition.config
	            };
	            var result = $injector.invoke(applyFn, applyFn, locals);
	            createApplyPromise(result).then(function(){
	              $scope.definition.title = editScope.definition.title;
	              angular.extend($scope.definition.config, editScope.definition.config);
	              if (widget.edit && widget.edit.reload) {
	                $scope.$broadcast('widgetConfigChanged');
	              }
	              editScope.closeDialog();
	            }, function(err){
	              if (err){
	                editScope.validationError = err;
	              } else {
	                editScope.validationError = 'Validation durring apply failed';
	              }
	            });
	          };
	        };
	    };
	    return $delegate;
	})
})
.run(["$templateCache", function($templateCache)
	{ $templateCache.put("widget-delete.html","<md-dialog aria-label=\"Remove Widget\"><md-toolbar><div class=\"md-toolbar-tools\"><img src=\"../icons/nn4.png\" style=\"height: 40px;\" /><h2>Delete {{widget.title}}</h2><span flex></span><a style=\"cursor: pointer;\" ng-click=\"closeDialog()\"><i class=\"material-icons\">close</i></a></div></md-toolbar><md-dialog-content><div class=\"md-dialog-content\"><form role=\"form\" name=\"confirmRemoveWidget\"><div layout=\"column\"><md-content style=\"padding-bottom: 18px;background-color: white\">Are you sure you want to delete this widget ?</md-content><div layout=row layout-align=\"end\" flex><md-button ng-click=\"closeDialog()\" class=\"md-raised md-primary\">Cancel</md-button><md-button ng-click=\"deleteDialog()\" type=\"submit\" class=\"md-raised md-primary\">Delete</md-button></div></div></form></div></md-dialog-content></md-dialog>");
 	$templateCache.put("widget-edit.html","<md-dialog aria-label=\"Widget Configuration\"><md-toolbar><div class=\"md-toolbar-tools\"><img src=\"../icons/nn4.png\" style=\"height: 40px;\" /><h2>{{widget.title}}</h2><span flex></span><a style=\"cursor: pointer;\" ng-click=\"cancel()\"><i class=\"material-icons\">close</i></a></div></md-toolbar><md-dialog-content><div class=\"md-dialog-content\"><form role=\"form\" name=\"widgetEditForm\" novalidate><div layout=\"column\"><md-input-container ><label>Title</label><input type=text class=form-control id=widgetTitle ng-model=definition.title placeholder=\"Enter title\" required></md-input-container></div><div layout=row layout-align=\"end\" flex><md-button ng-click=\"closeDialog()\" class=\"md-raised md-primary\">Cancel</md-button><md-button ng-click=\"saveDialog()\"  type=\"submit\" class=\"md-raised md-primary\">OK</md-button></div></form></div></md-dialog-content></md-dialog>");
	$templateCache.put("customDashboardEdit.html","<md-dialog aria-label=\"Edit Dashboard\"><md-toolbar><div class=\"md-toolbar-tools\"><img src=\"../icons/nn4.png\" style=\"height: 40px;\" /><h2>Edit Dashboard</h2><span flex></span><a style=\"cursor: pointer;\" ng-click=\"closeDialog()\"><i class=\"material-icons\">close</i></a></div></md-toolbar><md-dialog-content><div class=\"md-dialog-content\"><form role=form><div layout=\"column\"><div><label>Structure</label><md-radio-group ng-model=\"model.structure\" class=\"md-primary\"><md-radio-button ng-value=key ng-repeat=\"(key, structure) in structures\" ng-click=\"changeStructure(key, structure)\">{{ key }}</md-radio-button></md-radio-group></div><div layout=row layout-align=\"end\" flex><md-button ng-click=\"closeDialog()\" class=\"md-raised md-primary\">Close</md-button></div></div></form></div></md-dialog-content></md-dialog>");
	$templateCache.put("customWidgetAdd.html","<md-dialog aria-label=\"Add Widget\"> <md-toolbar> <div class=\"md-toolbar-tools\"> <img src=\"../icons/nn4.png\" style=\"height: 40px;\" /><h2>Add New NEXA Application</h2> <span flex></span> <a style=\"cursor: pointer;\" ng-click=\"closeDialog()\"> <i class=\"material-icons\">close</i> </a> </div> </md-toolbar> <md-dialog-content> <div class=\"md-dialog-content\"> <form role=\"form\" name=\"userPrefs\"> <div layout=\"column\"> <dl class=dl-horizontal> <dt ng-repeat-start=\"(key, widget) in widgets\"> <a href ng-click=addWidget(key)> {{widget.title}} </a> </dt> <dd ng-repeat-end ng-if=widget.description> {{widget.description}}</dd> </dl> <div layout=row layout-align=\"end\" flex> <md-button ng-click=\"closeDialog()\" class=\"md-raised md-primary\">Cancel</md-button> </div> </div> </form> </div> </md-dialog-content> </md-dialog>");
	$templateCache.put("renameDashboard.html","<md-dialog aria-label=\"Rename Dashboard\"><md-toolbar><div class=\"md-toolbar-tools\"><img src=\"../icons/nn4.png\" style=\"height: 40px;\" /><h2>What would you like to name your NEXA Dashboard ?</h2><span flex></span><a style=\"cursor: pointer;\" ng-click=\"cancel()\"><i class=\"material-icons\">close</i></a></div></md-toolbar><md-dialog-content><div class=\"md-dialog-content\"><form role=\"form\" name=\"renameDshBrd\"><div layout=\"column\"><md-input-container ><label>Logic Debug Directory</label><input ng-model=\"renmDshBrdCtrl.dshBrdName\" name=\"dshBrdName\" size=\"50\" type=\"text\"></md-input-container><div layout=row layout-align=\"end\" flex><md-button ng-click=\"cancel()\" class=\"md-raised md-primary\">Cancel</md-button><md-button ng-click=\"renmDshBrd(renmDshBrdCtrl)\"  type=\"submit\" class=\"md-raised md-primary\">OK</md-button></div></div></form></div></md-dialog-content></md-dialog>");
	$templateCache.put("widget-fullscreen.html","<head><style type=\"text/css\">.ace_editor {height : 610px;}</style></head><md-dialog class=\"_md md-transition-in\" role=\"dialog\" style=\"min-width: 99%;min-height: 99%;padding-top: 54px\" aria-label=\"widgetFullScreen\"><form class=\"ng-pristine ng-valid\"><md-toolbar><div class=\"md-toolbar-tools\" style=\"background-color: #00B4A0;\"><img src=\"../icons/nn4.png\" style=\"height: 40px;\" /><span class=\"md-title\" style=\"color:white\">{{definition.title}}</span><span flex></span><a style=\"cursor: pointer;\" ng-click=\"closeDialog()\"><i class=\"material-icons\">close</i></a></div></md-toolbar><md-dialog-content><div class=\"md-dialog-content\" style=\"padding: 3px;\"><form role=\"form\" name=\"widgetFullScreenForm\" novalidate role=form ng-submit=saveDialog() ng-keyup=saveDialog() ng-mouseup=saveDialog()><div layout=\"column\"><md-content style=\"padding-bottom: 18px;background-color: white\"><adf-widget-content model=definition content=widget></adf-widget-content></md-content></div></form></div></md-dialog-content></form></md-dialog>");
	$templateCache.put("customDashboardColumn.html","<div adf-id={{column.cid}} class=column ng-class=column.styleClass ng-model=column.widgets col-count={{column.count}} resizable r-directions=\"{{column.count==1 ? [\'right\'] : \'[]\'}}\" r-flex=\"{{column.count==1 ? \'true\' : \'false\'}}\" style=\"width:{{column.widgWidth}}px;\"> <adf-widget class=\"widgResiz\" ng-repeat=\"definition in column.widgets\" definition=definition column=column edit-mode=editMode options=options widget-state=widgetState resizable r-directions=\"[\'bottom\']\" r-flex=\'true\'> </adf-widget> </div>");
}]);
