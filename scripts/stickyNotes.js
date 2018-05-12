angular.module('adfDynamicSample')

// Make Sticky Notes element content editable
// Usage: <div contenteditable="true">Foobar</div>
.directive('contenteditable', function() {
    return {
		restrict: 'A',
		require: '?ngModel',
		link: function(scope, element, attr, ngModel) {
			var read;
			if (!ngModel) {
				return;
			}
			ngModel.$render = function() {
				return element.html(ngModel.$viewValue);
			};
			element.bind('blur keyup change', function() {
				if (ngModel.$viewValue !== $.trim(element.html())) {
					return scope.$apply(read);
				}
			});
			return read = function() {
				return ngModel.$setViewValue($.trim(element.html()));
			};
		}
    };
})

// Make Sticky Notes element draggable
// Usage: <div draggable>Foobar</div>
.directive('draggable', function() {
	return {
		// A = attribute, E = Element, C = Class and M = HTML Comment
		restrict:'A',
		// scope: {
		//   ctrlFn : '&',
		//   callback: '&onResize'
		// },
		// controller: 'navigationCtrl',
		//The link function is responsible for registering DOM listeners as well as updating the DOM.
		link: function(scope, element, attrs) {
			element.draggable({
				revert: false,
				handle: "#sticky-header",
				stop: function handleDragStop( event, ui ) {
					var offsetXPos = parseInt( ui.offset.left );
					var offsetYPos = parseInt( ui.offset.top );
					scope.ctrlFn(offsetXPos,offsetYPos,element[0].id);
				}
			})
			element[0].addEventListener('mousedown', function(e) {
				if(document.getElementsByClassName("vnc")){
					var vncSes = document.getElementsByClassName("vnc");
					for(var i = 0; i < vncSes.length; i++)
					{
						vncSes.item(i).style.pointerEvents = "none";
					}
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
		}
	}
})

// Make Sticky Notes element resizable
// Usage: <div resizsticky>Foobar</div>
.directive('resizsticky', function () {
    return {
		restrict: 'A',
		scope: {
			callback: '&onResize'
		},
		link: function postLink(scope, elem, attrs) {
			elem.resizable();
			elem.on('resize', function (evt, ui) {
				scope.$apply(function() {
					if (scope.callback) { 
						scope.callback({$evt: evt, $ui: ui, noteId: elem[0].id}); 
					}                
				})
				elem[0].addEventListener('mousedown', function(e) {
					if(document.getElementsByClassName("vnc")){
						var vncSes = document.getElementsByClassName("vnc");
						for(var i = 0; i < vncSes.length; i++)
						{
							vncSes.item(i).style.pointerEvents = "none";
						}
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
});