var Orientation;
(function (Orientation) {
    Orientation[Orientation["Horizontal"] = 0] = "Horizontal";
    Orientation[Orientation["Vertical"] = 1] = "Vertical";
})(Orientation || (Orientation = {}));

var PanelPosition;
(function (PanelPosition) {
    PanelPosition[PanelPosition["Above"] = 0] = "Above";
    PanelPosition[PanelPosition["Right"] = 1] = "Right";
    PanelPosition[PanelPosition["Below"] = 2] = "Below";
    PanelPosition[PanelPosition["Left"] = 3] = "Left";
})(PanelPosition || (PanelPosition = {}));

var panelBeingDragged = null;

function create(html) {
    var fragment = document.createDocumentFragment(), temp = document.createElement('div');
    temp.innerHTML = html;
    while (temp.firstChild) {
        fragment.appendChild(temp.firstChild);
    }
    return fragment;
}

var DropOptions = (function () {
    function DropOptions(panel) {
        var _this = this;
        this.panel = panel;
        this.element = create("<div class='dd-options'><span class='dd-option-top'>Top</span><span class='dd-option-bottom'>Bottom</span><span class='dd-option-left'>Left</span><span class='dd-option-right'>Right</span></div>").firstChild;
        this.topDrop = this.element.getElementsByClassName('dd-option-top').item(0);
        this.bottomDrop = this.element.getElementsByClassName('dd-option-bottom').item(0);
        this.leftDrop = this.element.getElementsByClassName('dd-option-left').item(0);
        this.rightDrop = this.element.getElementsByClassName('dd-option-right').item(0);

        this.previewElement = document.createElement('div');

        [this.topDrop, this.bottomDrop, this.leftDrop, this.rightDrop].forEach(function (drop) {
            drop.addEventListener('dragenter', function (ev) {
                return _this.dragEnter(ev);
            });
            drop.addEventListener('dragover', function (ev) {
                return _this.dragOver(ev);
            });
            drop.addEventListener('dragleave', function (ev) {
                return _this.dragLeave(ev);
            });
            drop.addEventListener('drop', function (ev) {
                return _this.drop(ev);
            });
        });
    }
    DropOptions.prototype.dragEnter = function (ev) {
        var _this = this;
        var drop = ev.target;
        drop.classList.add('highlight');
        ev.preventDefault();

        var el = this.previewElement;
        el.className = 'dd-preview';
        el.classList.add(this.getClassForDrop(drop));

        setTimeout(function () {
            return _this.panel.element.appendChild(el);
        });
    };

    DropOptions.prototype.dragLeave = function (ev) {
        var _this = this;
        var drop = ev.target;
        drop.classList.remove('highlight');

        var el = this.previewElement;
        if (el.classList.contains(this.getClassForDrop(drop))) {
            setTimeout(function () {
                return _this.panel.element.removeChild(el);
            });
        }
    };

    DropOptions.prototype.dragOver = function (ev) {
        ev.preventDefault();
        ev.dataTransfer.dropEffect = 'copyMove';
    };

    DropOptions.prototype.drop = function (ev) {
        this.dragLeave(ev);

        var drop = ev.target;
        var position = this.getPositionForDrop(drop);

        this.panel.split(panelBeingDragged, position);
    };

    DropOptions.prototype.getClassForDrop = function (drop) {
        var position = this.getPositionForDrop(drop);
        return 'dd-preview-' + PanelPosition[position].toLowerCase();
    };

    DropOptions.prototype.getPositionForDrop = function (drop) {
        if (drop === this.topDrop) {
            return PanelPosition.Above;
        } else if (drop === this.bottomDrop) {
            return PanelPosition.Below;
        } else if (drop === this.leftDrop) {
            return PanelPosition.Left;
        } else if (drop === this.rightDrop) {
            return PanelPosition.Right;
        }
    };

    DropOptions.prototype.show = function () {
        this.panel.element.appendChild(this.element);
        this.visible = true;
    };

    DropOptions.prototype.hide = function () {
        if (this.visible) {
            this.panel.element.removeChild(this.element);
            this.visible = false;
        }
    };
    return DropOptions;
})();

var Panel = (function () {
    function Panel() {
        var _this = this;
        var frag = create("<div class='dd-panel' draggable='true'><span class='dd-handle'>Drag Handle</span><input/><button> | </button><button>--</button></div>");
        this.element = frag.firstChild;
        this.dragHandle = this.element.getElementsByTagName('span').item(0);
        this.dropOptions = new DropOptions(this);

        this.element.getElementsByTagName('button').item(0).onclick = function (ev) {
            return _this.split(new Panel(), PanelPosition.Right);
        };
        this.element.getElementsByTagName('button').item(1).onclick = function (ev) {
            return _this.split(new Panel(), PanelPosition.Below);
        };

        this.element.addEventListener('mousedown', function (ev) {
            return _this.mouseDownOn = ev.target;
        });
        this.element.addEventListener('dragstart', function (ev) {
            return _this.dragStart(ev);
        });
        this.element.addEventListener('dragend', function (ev) {
            return _this.dragEnd(ev);
        });
        this.element.addEventListener('dragenter', function (ev) {
            return _this.dragEnter(ev);
        });
        this.element.addEventListener('dragleave', function (ev) {
            return _this.dragLeave(ev);
        });
        this.element.addEventListener('drop', function (ev) {
            return _this.drop(ev);
        });
    }
    Panel.prototype.split = function (newPanel, position) {
        newPanel.dragUndoToken = null;
        this.parentContainer.add(newPanel, position, this);
    };

    Panel.prototype.dragStart = function (ev) {
        var _this = this;
        if (!this.dragHandle.contains(this.mouseDownOn)) {
            ev.preventDefault();
            return;
        }
        panelBeingDragged = this;
        ev.dataTransfer.effectAllowed = 'copyMove';

        setTimeout(function () {
            return _this.dragUndoToken = _this.parentContainer.remove(_this);
        });
    };

    Panel.prototype.dragEnd = function (ev) {
        var _this = this;
        if (this.dragUndoToken) {
            setTimeout(function () {
                _this.dragUndoToken();
                _this.dragUndoToken = null;
            });
        }

        panelBeingDragged = null;
    };

    Panel.prototype.dragEnter = function (ev) {
        var _this = this;
        setTimeout(function () {
            return _this.dropOptions.show();
        });
    };

    Panel.prototype.dragLeave = function (ev) {
        var _this = this;
        var isInChildElement = this.element.contains(ev.relatedTarget);
        if (!ev.relatedTarget) {
            var elementUnderMouse = document.elementFromPoint(ev.clientX, ev.clientY);
            isInChildElement = this.element.contains(elementUnderMouse);
        }

        if (isInChildElement) {
            return;
        }

        setTimeout(function () {
            return _this.dropOptions.hide();
        });
    };

    Panel.prototype.drop = function (ev) {
        var _this = this;
        setTimeout(function () {
            return _this.dropOptions.hide();
        });
    };
    return Panel;
})();

var Container = (function () {
    function Container(panel) {
        this.children = [];
        this.element = create("<div class='dd-container'></div>").firstChild;

        this.insert(0, panel);
    }
    Container.prototype.resize = function () {
        var size = 100 / this.children.length;
        var width = this.orientation == Orientation.Horizontal ? size : 100;
        var height = this.orientation == Orientation.Vertical ? size : 100;
        this.children.forEach(function (panel) {
            panel.element.style.width = width + '%';
            panel.element.style.height = height + '%';
        });
    };

    Container.prototype.insert = function (index, child) {
        child.parentContainer = this;
        this.children.splice(index, 0, child);
        var nextElement = this.element.childNodes.item(index);
        this.element.insertBefore(child.element, nextElement);

        this.resize();
    };

    Container.prototype.add = function (newPanel, position, relativeTo) {
        var necessaryOrientation = (position == PanelPosition.Above || position == PanelPosition.Below) ? Orientation.Vertical : Orientation.Horizontal;
        var needsSubContainer = this.children.length > 1 && necessaryOrientation !== this.orientation;
        var index = this.children.indexOf(relativeTo);

        if (needsSubContainer) {
            this.children.splice(index, 1);
            var subContainer = new Container(relativeTo);
            subContainer.parentContainer = this;
            subContainer.add(newPanel, position, relativeTo);
            this.insert(index, subContainer);
        } else {
            this.orientation = necessaryOrientation;
            var after = position == PanelPosition.Below || PanelPosition.Right;
            if (after) {
                index = index + 1;
            }
            this.insert(index, newPanel);
        }
    };

    Container.prototype.internalRemove = function (panel) {
        var _this = this;
        var index = this.children.indexOf(panel);
        this.children.splice(index, 1);
        this.element.removeChild(panel.element);

        this.resize();

        return function () {
            _this.insert(index, panel);
        };
    };

    Container.prototype.remove = function (panel) {
        if (this.children.length == 2 && this.parentContainer) {
            var undo1 = this.internalRemove(panel);
            var onlyChild = this.children[0];
            var undo2 = this.internalRemove(onlyChild);
            var undo3 = this.parentContainer.replace(onlyChild, this);
            return function () {
                undo3();
                undo2();
                undo1();
            };
        } else {
            return this.internalRemove(panel);
        }

        this.resize();
    };

    Container.prototype.replace = function (newPanel, oldPanel) {
        var _this = this;
        var index = this.children.indexOf(oldPanel);
        this.internalRemove(oldPanel);
        this.insert(index, newPanel);

        return function () {
            _this.internalRemove(newPanel);
            _this.insert(index, oldPanel);
        };
    };
    return Container;
})();

var WorkZone = (function () {
    function WorkZone(el) {
        this.element = el;

        var p = new Panel();
        this.rootContainer = new Container(p);
        this.rootContainer.add(new Panel(), PanelPosition.Right, p);
        this.element.appendChild(this.rootContainer.element);
    }
    return WorkZone;
})();

var workzone;

window.onload = function () {
    var el = document.getElementById('workzone');
    workzone = new WorkZone(el);
};
//# sourceMappingURL=app.js.map
