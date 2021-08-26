import PubSub from 'pubsub-js';

export enum CollapsibleComponentEvents {
    COMPONENT_SHOWN = 'collapsible_component.show'
}

/**
 * Framework for managing complex show/hide interactions among collapsible components,
 * to autohide certain components when conflicting ones get open.
 */
export default abstract class CollapsibleComponent {
    protected conflictingComponents: Set<CollapsibleComponent>;

    constructor() {
        this.conflictingComponents = new Set();
        PubSub.subscribe(
            CollapsibleComponentEvents.COMPONENT_SHOWN,
            this.onComponentShown.bind(this)
        );
    }

    /**
     * Do not override this method. Sends pubsub message for a component being shown,
     * which will trigger hiding conflicting components.
     */
    show(): void {
        PubSub.publish(CollapsibleComponentEvents.COMPONENT_SHOWN, {
            component: this
        });
        this.showComponent();
    }

    /**
     * Do not override this method. Hides component. Might do something else in the
     * future.
     */
    hide(): void {
        this.hideComponent();
    }

    /**
     * Registers conflicting components for this component.
     *
     * @param otherComponents Array of other conflicting components
     */
    registerConflicts(otherComponents: Array<CollapsibleComponent>) {
        otherComponents.forEach((component: CollapsibleComponent) => {
            if (component !== this) {
                this.conflictingComponents.add(component);
                component.conflictingComponents.add(this);
            }
        });
    }

    /**
     * Registers conflicting component singletons for the given singleton component
     *
     * @param componentClass Class name to register conflicts for
     * @param conflictingClasses Array of classes conflicting with `componentClass`
     */
    static registerSingletonConflicts(componentClass: any, conflictingClasses: Array<any>) {
        let conflictingComponents = conflictingClasses.map((cls: any) => cls.getInstance());
        componentClass.getInstance().registerConflicts(conflictingComponents);
    }

    /**
     * Hides components on another component being shown.
     */
    protected onComponentShown(msg: any, { component }: { component: CollapsibleComponent }) {
        if (this.conflictingComponents.has(component)) {
            this.hideComponent();
        }
    }

    /**
     * Do not override this method.
     */
    protected onShow() {
        PubSub.publish(CollapsibleComponentEvents.COMPONENT_SHOWN, {
            component: this
        });
    }

    /**
     * Override this method to add logic that actually hides the component
     */
    protected abstract hideComponent(): void;

    /**
     * Override this method to add logic that actually shows the component
     */
    protected abstract showComponent(): void;
}
