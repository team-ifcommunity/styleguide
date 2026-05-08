(function(){
    function init() {
        var tabItems = document.querySelectorAll('.tabList li');

        tabItems.forEach(function(item){
            item.addEventListener('click', function(){
                var clicked = this;
                var button = clicked.querySelector('button');
                if (button) button.setAttribute('aria-selected', 'true');

                var siblings = Array.from(clicked.parentElement.children).filter(function(el){ return el !== clicked; });
                siblings.forEach(function(sibling){
                    var siblingButton = sibling.querySelector('button');
                    if (siblingButton) siblingButton.setAttribute('aria-selected', 'false');
                });
            });
        });

        tabItems.forEach(function(item){
            var button = item.querySelector('button');
            if (button) {
                button.setAttribute('aria-selected', item.classList.contains('active') ? 'true' : 'false');
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
