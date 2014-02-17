enum Orientation {
    Horizontal,
    Vertical,
}

enum PanelPosition {
    Above,
    Right,
    Below,
    Left,
}

interface UndoToken {
    (): void;
}

var panelBeingDragged = null;

function create(html: string): DocumentFragment {
    var fragment = document.createDocumentFragment(),
        temp = document.createElement('div');
    temp.innerHTML = html;
    while (temp.firstChild) {
        fragment.appendChild(temp.firstChild);
    }
    return fragment;
}

class DropOptions {
    panel: Panel;
    element: HTMLElement;
    visible: boolean;
    previewElement: HTMLElement;
    topDrop: HTMLElement;
    bottomDrop: HTMLElement;
    leftDrop: HTMLElement;
    rightDrop: HTMLElement;


    constructor(panel: Panel) {
        this.panel = panel;
        this.element = <HTMLElement>create("<div class='dd-options'><span class='dd-option-top'>Top</span><span class='dd-option-bottom'>Bottom</span><span class='dd-option-left'>Left</span><span class='dd-option-right'>Right</span></div>").firstChild;
        this.topDrop = <HTMLElement>this.element.getElementsByClassName('dd-option-top').item(0);
        this.bottomDrop = <HTMLElement>this.element.getElementsByClassName('dd-option-bottom').item(0);
        this.leftDrop = <HTMLElement>this.element.getElementsByClassName('dd-option-left').item(0);
        this.rightDrop = <HTMLElement>this.element.getElementsByClassName('dd-option-right').item(0);

        this.previewElement = document.createElement('div');
        
        [this.topDrop, this.bottomDrop, this.leftDrop, this.rightDrop].forEach(drop=> {
            drop.addEventListener('dragenter', ev => this.dragEnter(ev));
            drop.addEventListener('dragover', ev => this.dragOver(ev));
            drop.addEventListener('dragleave', ev => this.dragLeave(ev));
            drop.addEventListener('drop', ev => this.drop(ev));
        });
    }

    dragEnter(ev: DragEvent): void {
        var drop = <HTMLElement>ev.target;
        drop.classList.add('highlight');
        ev.preventDefault();

        var el = this.previewElement;
        el.className = 'dd-preview';
        el.classList.add(this.getClassForDrop(drop));

        setTimeout(() => this.panel.element.appendChild(el));
    }

    dragLeave(ev: DragEvent): void {
        var drop = <HTMLElement>ev.target;
        drop.classList.remove('highlight');

        var el = this.previewElement;
        if (el.classList.contains(this.getClassForDrop(drop))) {
            setTimeout(() => this.panel.element.removeChild(el));
        }
    }

    dragOver(ev: DragEvent): void {
        ev.preventDefault();
        ev.dataTransfer.dropEffect = 'copyMove';
    }

    drop(ev: DragEvent): void {
        this.dragLeave(ev);
        
        var drop = <HTMLElement>ev.target;
        var position = this.getPositionForDrop(drop);
        
        this.panel.split(panelBeingDragged, position);
    }

    private getClassForDrop(drop: HTMLElement): string {
        var position = this.getPositionForDrop(drop);
        return 'dd-preview-' + PanelPosition[position].toLowerCase();
    }

    private getPositionForDrop(drop: HTMLElement): PanelPosition {
        if (drop === this.topDrop) {
            return PanelPosition.Above;
        } else if (drop === this.bottomDrop) {
            return PanelPosition.Below;
        } else if (drop === this.leftDrop) {
            return PanelPosition.Left;
        } else if (drop === this.rightDrop) {
            return PanelPosition.Right;
        }
    }

    show(): void {
        this.panel.element.appendChild(this.element);
        this.visible = true;
    }

    hide(): void {
        if (this.visible) {
            this.panel.element.removeChild(this.element);
            this.visible = false;
        }
    }
}

class Panel implements IPanel {
    element: HTMLElement;
    parentContainer: Container;
    dragHandle: HTMLElement;
    mouseDownOn: HTMLElement;
    dragUndoToken: UndoToken;
    dropOptions: DropOptions;

    constructor() {
        var frag = create("<div class='dd-panel' draggable='true'><span class='dd-handle'>Drag Handle</span><input/><button> | </button><button>--</button></div>");
        this.element = <HTMLElement>frag.firstChild;
        this.dragHandle = this.element.getElementsByTagName('span').item(0);
        this.dropOptions = new DropOptions(this);

        this.element.getElementsByTagName('button').item(0).onclick = ev => this.split(new Panel(), PanelPosition.Right);
        this.element.getElementsByTagName('button').item(1).onclick = ev => this.split(new Panel(), PanelPosition.Below);

        this.element.addEventListener('mousedown', ev => this.mouseDownOn = <HTMLElement>ev.target);
        this.element.addEventListener('dragstart', ev => this.dragStart(ev));
        this.element.addEventListener('dragend', ev => this.dragEnd(ev));
        this.element.addEventListener('dragenter', ev => this.dragEnter(ev));
        this.element.addEventListener('dragleave', ev => this.dragLeave(ev));
        this.element.addEventListener('drop', ev => this.drop(ev));
    }

    split(newPanel: Panel, position: PanelPosition): void {
        newPanel.dragUndoToken = null;
        this.parentContainer.add(newPanel, position, this);
    }

    dragStart(ev: DragEvent): void {
        if (!this.dragHandle.contains(this.mouseDownOn)) {
            ev.preventDefault();
            return;
        }
        panelBeingDragged = this;
        ev.dataTransfer.effectAllowed = 'copyMove';

        setTimeout(() => this.dragUndoToken = this.parentContainer.remove(this));
    }

    dragEnd(ev: DragEvent): void {
        //if (ev.dataTransfer.dropEffect === 'none') { // dropEffect and dropAllowed appear broken in Chrome
        if (this.dragUndoToken) {
            setTimeout(() => {
                this.dragUndoToken();
                this.dragUndoToken = null;
            });
        }

        panelBeingDragged = null;
    }

    dragEnter(ev: DragEvent): void {
        setTimeout(() => this.dropOptions.show());
    }

    dragLeave(ev: DragEvent): void {
        var isInChildElement = this.element.contains(<HTMLElement>ev.relatedTarget);
        if (!ev.relatedTarget) { // Chrome/webkit doesn't set the relatedTarget property on dragleave
            var elementUnderMouse = <HTMLElement>document.elementFromPoint(ev.clientX, ev.clientY);
            isInChildElement = this.element.contains(elementUnderMouse);
        }

        if (isInChildElement) {
            return;
        }

        setTimeout(() => this.dropOptions.hide());
    }

    drop(ev: DragEvent): void {
        setTimeout(() => this.dropOptions.hide());
    }
}

interface IPanel {
    element: HTMLElement;
    parentContainer: Container;
}

class Container implements IPanel {
    element: HTMLElement;
    orientation: Orientation;
    children: IPanel[];
    parentContainer: Container;

    constructor(panel: Panel) {
        this.children = [];
        this.element = <HTMLElement>create("<div class='dd-container'></div>").firstChild;

        this.insert(0, panel);
    }

    resize(): void {
        var size = 100 / this.children.length;
        var width = this.orientation == Orientation.Horizontal ? size : 100;
        var height = this.orientation == Orientation.Vertical ? size : 100;
        this.children.forEach(panel => {
            panel.element.style.width = width + '%';
            panel.element.style.height = height + '%';
        });
    }

    private insert(index: number, child: IPanel): void {
        child.parentContainer = this;
        this.children.splice(index, 0, child);
        var nextElement = this.element.childNodes.item(index);
        this.element.insertBefore(child.element, nextElement);

        this.resize();
    }

    add(newPanel: Panel, position: PanelPosition, relativeTo: Panel): void {
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
    }

    private internalRemove(panel: IPanel): UndoToken {
        var index = this.children.indexOf(panel);
        this.children.splice(index, 1);
        this.element.removeChild(panel.element);

        this.resize();

        return () => {
            this.insert(index, panel);
        };
    }

    remove(panel: IPanel): UndoToken {
        if (this.parentContainer && this.children.length == 2) {
            var undoChain = [];
            undoChain.unshift(this.internalRemove(panel));

            var onlyChild = this.children[0];
            undoChain.unshift(this.internalRemove(onlyChild));

            var onlyChildAsContainer = <Container>onlyChild;
            if (!!onlyChildAsContainer.children && !!this.parentContainer && this.parentContainer.orientation === onlyChildAsContainer.orientation) {
                var children: IPanel[] = [];
                onlyChildAsContainer.children.forEach(p=> children.push(p));
                undoChain.unshift(() => {
                    onlyChildAsContainer.children = [];
                    children.forEach(p=> {
                        p.parentContainer = onlyChildAsContainer;
                        onlyChildAsContainer.children.push(p);
                        onlyChildAsContainer.element.appendChild(p.element);
                    });
                    onlyChildAsContainer.resize();
                });

                undoChain.unshift(this.parentContainer.replace(onlyChildAsContainer.children, this));
            } else {
                undoChain.unshift(this.parentContainer.replace([onlyChild], this));
            }

            return () => {
                undoChain.forEach(u=> u());
            };
        } else {
            return this.internalRemove(panel);
        }
    }

    private replace(newPanels: IPanel[], oldPanel: IPanel): UndoToken {
        var index = this.children.indexOf(oldPanel);

        var spliceArgs: any[] = [index, 1];
        newPanels.forEach(p=> spliceArgs.push(p));
        [].splice.apply(this.children, spliceArgs);
        newPanels.forEach(p=> p.parentContainer = this);
        newPanels.forEach(p=> this.element.insertBefore(p.element, oldPanel.element));
        this.element.removeChild(oldPanel.element);

        this.resize();

        return () => {
            this.children.splice(index, newPanels.length, oldPanel);
            oldPanel.parentContainer = this;
            this.element.insertBefore(oldPanel.element, newPanels[0].element);
            newPanels.forEach(p=> this.element.removeChild(p.element));
            this.resize();
        };
    }
}

class WorkZone {
    element: HTMLElement;
    rootContainer: Container;

    constructor(el: HTMLElement) {
        this.element = el;
        
        var p = new Panel();
        this.rootContainer = new Container(p);
        this.rootContainer.add(new Panel(), PanelPosition.Right, p);
        this.element.appendChild(this.rootContainer.element);
    }
}

var workzone: WorkZone;

window.onload = () => {
    var el = document.getElementById('workzone');
    workzone = new WorkZone(el);
};