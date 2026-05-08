/* styleguide 페이지 에서만 사용됩니다. */
$(function(){
    const $root = $('#root');
    const $menuScrollArea = $('.styleguideLeftAreaBottom');

    const pathname = location.pathname;
    const isStyleguideRootPage = /\/html\/styleguide(?:_ver2)?\.html$/i.test(pathname);
    const imageBasePath = isStyleguideRootPage ? '../assets/images' : '../../assets/images';

    function getActiveMenuItem() {
        const $activeMenuItem = $('.styleguideMenuItem.active').first();

        if ($activeMenuItem.length) {
            return $activeMenuItem;
        }

        return $('.styleguideMenuItem').filter(function () {
            const href = $(this).find('a').attr('href');

            if (!href) return false;

            try {
                return new URL(href, location.href).pathname === pathname;
            } catch (error) {
                return false;
            }
        }).first();
    }

    function scrollActiveMenuItemToCenter(behavior) {
        const $activeMenuItem = getActiveMenuItem();

        if (!$menuScrollArea.length || !$activeMenuItem.length) {
            return;
        }

        const container = $menuScrollArea.get(0);
        const menuItem = $activeMenuItem.get(0);
        const targetScrollTop =
            menuItem.offsetTop - (container.clientHeight / 2) + (menuItem.offsetHeight / 2);
        const maxScrollTop = container.scrollHeight - container.clientHeight;
        const nextScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));

        container.scrollTo({
            top: nextScrollTop,
            behavior: behavior || 'auto'
        });
    }

    /* 
        기존 styleguide와 styleguide ver2 의 img 경로가 서로 달라서 src 대신 data-src로 값을 가져온다음, 
        js에서 최종 img url을 설정 
    */
    $('.styleguideContents img').each(function () {
        let src = $(this).attr('data-src');

        if (!src) return;

        if (!pathname.includes('ver2')) {
            // styleguide 루트와 하위 상세 페이지의 실제 깊이에 맞춰 이미지 경로를 고정
            src = src.replace(/^(\.\.\/)+images/, imageBasePath);
        }

        $(this).attr('src', src);
    });

    /* 혹시나 root에 position이 fixed일경우 */
    if($root.find('.styleguideRoot').length > 0) {
        $root.css('position', 'static');
    }

    $('.styleguideBtnCodingList').on({
        'click': function() {
            window.open(codingList, '_blank');
        }
    });

    const $firstMenuItem = $('.styleguideMenuItem:first-of-type a');
    let codingList = '../html/00_coding_list.html';
    let styleguideUrl = '../html/styleguide.html';

     if (location.pathname.includes('/html/styleguide.html')) {
        $firstMenuItem.attr('href', styleguideUrl);
        $('.styleguideLeftAreaLogo').attr('src', '../assets/images/common/logo/img-if-logo.png');
    } else {
        styleguideUrl = '../styleguide.html';
        codingList = '../../html/00_coding_list.html';
        $firstMenuItem.attr('href', styleguideUrl);
        $('.styleguideLeftAreaLogo').attr('src', '../../assets/images/common/logo/img-if-logo.png');

        //첫번째 styleguideMenuItem의 a를 제외한 나머지 a태그의 href 값을 현재 파일경로에 맞게 변경합니다.
        $('.styleguideMenuItem:not(:first-of-type) a').each(function(){
            const link = $(this).attr('href');
            const linkReplace = link.replace('../html', '..');
            $(this).attr('href', linkReplace);
        });
    }

    $('.styleguideLeftAreaLogo').css('display', 'block');
    scrollActiveMenuItemToCenter('smooth');

    $(window).on('load pageshow', function () {
        window.requestAnimationFrame(function () {
            scrollActiveMenuItemToCenter('smooth');
        });
    });

    /* Icon 스타일가이드: 아이콘 클릭 시 코드 예시에 해당 아이콘 반영 */
    $(document).on('click', '.styleguideIconGrid .svg-icon', function(){
        const $icon = $(this);
        const iconId = $icon.find('use').attr('href');
        if (!iconId) return;

        const $row = $icon.closest('.styleguideContentsSection');
        const $code = $row.find('.codeArea code.hljs');
        if (!$code.length) return;

        const codeStr = '<svg class="svg-icon icon--24 color-white" aria-hidden="true">\n    <use href="' + iconId + '"></use>\n</svg>';
        $code.text(codeStr);
    });
    $(document).on('click', '.styleguideIconGrid img', function(){
        const $img = $(this);
        const src = $img.attr('src');
        const alt = $img.attr('alt') || '';
        if (!src) return;

        const $row = $img.closest('.styleguideContentsSection');
        const $code = $row.find('.codeArea code.hljs');
        if (!$code.length) return;

        const codeStr = '<img src="' + src + '" class="icon--40" alt="' + alt + '" />';
        $code.text(codeStr);
    });
});
 