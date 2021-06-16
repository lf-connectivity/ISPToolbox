export class MarketEvaluatorSidebarManager {
    private static instance: MarketEvaluatorSidebarManager;

    private constructor() { }

    public static getInstance(): MarketEvaluatorSidebarManager {
        if (!MarketEvaluatorSidebarManager.instance) {
            MarketEvaluatorSidebarManager.instance = new MarketEvaluatorSidebarManager();
        }
        return MarketEvaluatorSidebarManager.instance;
    }

    public initializePopovers() {
        console.log('initilaize popover');
        // @ts-ignore
        // $('[data-toggle="popover"]').popover();
        // link tooltip button to the contents
        // @ts-ignore
        $("[data-toggle=popover]").popover({
            html: true,
            class: "btn info-tooltip-button",
            content: function () {
                var content = $(this).attr("data-popover-content");
                return content;
            },
            title: function () {
                var title = $(this).attr("data-popover-title");
                return title;
            }
        });
        //keep popover open to allow user to click on links inside
        $('body').on('click', function (e) {
            $('[data-toggle="popover"]').each(function () {
                if (!$(this).is(e.target) && $(this).has(e.target).length === 0 && $('.popover')
                    .has(e
                        .target).length === 0) {
                    // @ts-ignore
                    $(this).popover('hide');
                }
            });
        });
        // Only one popover opens at a time
        // @ts-ignore
        $('body').popover({
            selector: '[rel=popover]',
            trigger: "click"
        }).on("show.bs.popover", function (e: any) {
            // @ts-ignore
            $("[rel=popover]").not(e.target).popover("destroy");
            $(".popover").remove();
        });
    }
}