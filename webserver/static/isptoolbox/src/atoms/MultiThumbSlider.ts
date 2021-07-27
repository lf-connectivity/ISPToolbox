/*
 *   This content is licensed according to the W3C Software License at
 *   https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document
 *
 *   File:   slider.js
 *
 *   Desc:   Slider widget that implements ARIA Authoring Practices
 */

// Create Slider that contains value, valuemin, valuemax, and valuenow
export class MultiThumbSlider {
    domNode: Element;
    railDomNode: Element | undefined;
    sliderNodes: Array<Element>;
    thumbs: Array<SliderThumb> = [];
    labelDomNode: Element;
    middleDomNode: Element;
    minDomNode: Element;
    maxDomNode: Element;
    railMin: number;
    railMax: number;
    railBorderWidth: number;
    thumbWidth: number;
    thumbHeight: number;
    constructor(domNode: Element, private onChangeCallback: (val: [number, number]) => void) {
        this.domNode = domNode;
        this.railDomNode = Array.from(domNode.children).find((n) => {
            return n.classList.contains('rail');
        });
        // Initilaize all the thumbs
        if (this.railDomNode) {
            this.sliderNodes = Array.from(this.railDomNode.children).filter((n) => {
                return n.getAttribute('role') === 'slider';
            });
            this.sliderNodes.forEach((n) => {
                if (this.railDomNode) {
                    this.thumbs.push(
                        new SliderThumb(
                            n,
                            this.railDomNode,
                            this.domNode,
                            this,
                            this.valChangeCallback.bind(this)
                        )
                    );
                }
            });
        }
    }

    redraw() {
        this.renderMiddleArea();
        this.thumbs.forEach((thumb) => {
            thumb.moveSliderTo(thumb.valueNow);
        });
    }

    renderMiddleArea() {
        let middle_area = Array.from(this.domNode.children).find((n) => {
            return n.classList.contains('aria-middle-area');
        });
        if (middle_area && this.thumbs.length >= 2) {
            var min_pos = this.thumbs
                .sort((thumb) => {
                    return thumb.valueNow;
                })[0]
                .getPosition();
            (middle_area as HTMLElement).style.left = `${min_pos * 100}%`;
            const width = this.thumbs
                .sort((thumb) => {
                    return thumb.valueNow;
                })
                [this.thumbs.length - 1].getPosition();
            (middle_area as HTMLElement).style.width = `${(width - min_pos) * 100}%`;
        }
    }

    valChangeCallback() {
        this.onChangeCallback(this.getRange());
    }

    getRange(): [number, number] {
        if (this.thumbs.length < 2) {
            return [Number.MIN_VALUE, Number.MAX_VALUE];
        }
        return [
            this.thumbs.sort((thumb) => {
                return thumb.valueNow;
            })[0].valueNow,
            this.thumbs.sort((thumb) => {
                return thumb.valueNow;
            })[this.thumbs.length - 1].valueNow
        ];
    }
}

export class SliderThumb {
    valueNow: number;
    relativeVal: number;
    dolValueNow: string;
    keyCode: any;

    constructor(
        public node: Element,
        private rail: Element,
        private slider: Element,
        private multithumbslider: MultiThumbSlider,
        private callback: () => void
    ) {
        node.addEventListener('keydown', this.handleKeyDown.bind(this));
        node.addEventListener('mousedown', this.handleMouseDown.bind(this));
        node.addEventListener('focus', this.handleFocus.bind(this));
        node.addEventListener('blur', this.handleBlur.bind(this));

        this.keyCode = Object.freeze({
            left: 37,
            up: 38,
            right: 39,
            down: 40,
            pageUp: 33,
            pageDown: 34,
            end: 35,
            home: 36
        });
        var attr = node.getAttribute('aria-valuenow');
        if (attr) {
            this.valueNow = parseFloat(attr);
        } else {
            this.valueNow = 0;
        }
        this.moveSliderTo(this.valueNow);
    }

    getMax(): number {
        var maxAttr = this.slider.getAttribute('aria-valuemax');
        if (maxAttr) {
            var valueMax = parseInt(maxAttr);
            return valueMax;
        }
        return 0;
    }
    getMin(): number {
        var minAttr = this.slider.getAttribute('aria-valuemin');
        if (minAttr) {
            var valueMin = parseInt(minAttr);
            return valueMin;
        }
        return 0;
    }
    getRailWidth(): number {
        return (this.rail as HTMLElement).offsetWidth;
    }

    calculateNewValue(event: MouseEvent): number {
        if (this.isLogScale()) {
            var diffX = event.pageX - (this.rail as HTMLElement).offsetLeft;
            return (
                this.getMin() * Math.pow(this.getMax() / this.getMin(), diffX / this.getRailWidth())
            );
        } else {
            var diffX = event.pageX - (this.rail as HTMLElement).offsetLeft;
            return this.getMin() + ((this.getMax() - this.getMin()) * diffX) / this.getRailWidth();
        }
    }

    isLogScale(): boolean {
        return this.slider.getAttribute('aria-logscale') === 'true';
    }

    getPositionLabel(): number {
        if (this.isLogScale()) {
            var val =
                Math.log(this.valueNow / this.getMin()) / Math.log(this.getMax() / this.getMin());
            return (
                val -
                (this.node.firstElementChild as HTMLElement).offsetWidth /
                    2 /
                    (this.node as HTMLElement).offsetWidth
            );
        } else {
            var val = this.valueNow / (this.getMax() - this.getMin());
            return (
                val -
                (this.node.firstElementChild as HTMLElement).offsetWidth /
                    2 /
                    (this.node as HTMLElement).offsetWidth
            );
        }
    }
    getPosition(): number {
        if (this.isLogScale()) {
            var val =
                Math.log(this.valueNow / this.getMin()) / Math.log(this.getMax() / this.getMin());
            return val;
        } else {
            var val = this.valueNow;
            return val / (this.getMax() - this.getMin());
        }
    }

    formatValueText(): string {
        if (this.valueNow > 1000) {
            return (this.valueNow / 1000).toFixed(1) + 'k';
        } else {
            return this.valueNow.toFixed(0);
        }
    }

    moveSliderTo(value: number) {
        var maxAttr = this.slider.getAttribute('aria-valuemax');
        var minAttr = this.slider.getAttribute('aria-valuemin');
        if (maxAttr && minAttr) {
            var valueMax = parseInt(maxAttr);
            var valueMin = parseInt(minAttr);

            if (value > valueMax) {
                value = valueMax;
            }

            if (value < valueMin) {
                value = valueMin;
            }
        }

        this.valueNow = value;
        this.dolValueNow = this.formatValueText();

        this.node.setAttribute('aria-valuenow', String(this.valueNow));
        this.node.setAttribute('aria-valuetext', this.dolValueNow);

        var pos = this.getPositionLabel();
        (this.node as HTMLElement).style.left = `${pos * 100}%`;
        if (this.node.firstElementChild) {
            this.node.firstElementChild.innerHTML = this.dolValueNow;
        }
        this.multithumbslider.renderMiddleArea();
        this.callback();
    }
    handleKeyDown(event: KeyboardEvent) {
        var flag = false;

        switch (event.keyCode) {
            case this.keyCode.left:
            case this.keyCode.down:
                this.moveSliderTo(this.valueNow - 1);
                flag = true;
                break;

            case this.keyCode.right:
            case this.keyCode.up:
                this.moveSliderTo(this.valueNow + 1);
                flag = true;
                break;

            case this.keyCode.pageDown:
                this.moveSliderTo(this.valueNow - 10);
                flag = true;
                break;

            case this.keyCode.pageUp:
                this.moveSliderTo(this.valueNow + 10);
                flag = true;
                break;

            case this.keyCode.home:
                this.moveSliderTo(this.getMin());
                flag = true;
                break;

            case this.keyCode.end:
                this.moveSliderTo(this.getMax());
                flag = true;
                break;

            default:
                break;
        }

        if (flag) {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    handleFocus(event: FocusEvent) {
        this.slider.classList.add('focus');
        this.rail.classList.add('focus');
    }

    handleBlur(event: FocusEvent) {
        this.slider.classList.remove('focus');
        this.rail.classList.remove('focus');
    }

    handleMouseDown(event: MouseEvent) {
        var self = this;

        var handleMouseMove = function (event: MouseEvent) {
            self.valueNow = self.calculateNewValue(event);
            self.moveSliderTo(self.valueNow);

            event.preventDefault();
            event.stopPropagation();
        };

        var handleMouseUp = function (event: MouseEvent) {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        // bind a mousemove event handler to move pointer
        document.addEventListener('mousemove', handleMouseMove);

        // bind a mouseup event handler to stop tracking mouse movements
        document.addEventListener('mouseup', handleMouseUp);

        event.preventDefault();
        event.stopPropagation();

        // Set focus to the clicked handle
        (this.node as HTMLElement).focus();
    }
}
