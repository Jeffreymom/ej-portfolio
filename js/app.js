document.addEventListener("DOMContentLoaded", function () {

    const searchInput = document.getElementById("searchInput");
    const portfolioItems = document.querySelectorAll(".portfolio-item");
    const filterButtons = document.querySelectorAll(".filter-btn");
    const loadMoreWrap = document.getElementById("videoLoadMoreWrap");
    const loadMoreBtn = document.getElementById("videoLoadMoreBtn");

    const VIDEO_INITIAL_COUNT = 6;
    const VIDEO_STEP = 3;
    let currentFilter = "featured";
    let videoVisibleCount = VIDEO_INITIAL_COUNT;

    function matchesFilter(item, filter) {
        if (filter === "featured") {
            return item.getAttribute("data-featured") === "true";
        }
        return item.getAttribute("data-category") === filter;
    }

    function matchesSearch(item, searchTerm) {
        if (!searchTerm) return true;
        const title = item.querySelector("h4").textContent.toLowerCase();
        return title.includes(searchTerm);
    }

    function applyFilters() {
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
        const videoItems = Array.from(portfolioItems).filter((item) => item.getAttribute("data-category") === "video");
        let visibleVideoIndex = 0;

        portfolioItems.forEach((item) => {
            const inFilter = matchesFilter(item, currentFilter);
            const inSearch = matchesSearch(item, searchTerm);
            let visible = inFilter && inSearch;

            if (visible && currentFilter === "video") {
                visibleVideoIndex += 1;
                if (visibleVideoIndex > videoVisibleCount) {
                    visible = false;
                }
            }

            item.style.display = visible ? "block" : "none";
        });

        if (loadMoreWrap) {
            const totalVideoMatches = videoItems.filter((item) => matchesSearch(item, searchTerm)).length;
            const showLoadMore = currentFilter === "video" && totalVideoMatches > videoVisibleCount;
            loadMoreWrap.hidden = !showLoadMore;
        }
    }

    if (searchInput) {
        searchInput.addEventListener("input", applyFilters);
    }

    filterButtons.forEach((button) => {
        button.addEventListener("click", function () {
            filterButtons.forEach((btn) => btn.classList.remove("active"));
            this.classList.add("active");

            currentFilter = this.getAttribute("data-filter");
            videoVisibleCount = VIDEO_INITIAL_COUNT;
            applyFilters();
        });
    });

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener("click", function () {
            videoVisibleCount += VIDEO_STEP;
            applyFilters();
        });
    }

    applyFilters();

    const heroVideo = document.querySelector(".hero-bg-media");
    const muteToggle = document.getElementById("muteToggle");
    if (heroVideo && muteToggle) {
        muteToggle.addEventListener("click", function () {
            heroVideo.muted = !heroVideo.muted;
            muteToggle.textContent = heroVideo.muted ? "Unmute" : "Mute";
        });
    }

    // 모달 영상 자동재생 제어: 모달이 열리면 처음부터 재생(가능하면 소리 포함),
    // 다른 모달 영상은 즉시 정지, 모달을 닫으면 정지 및 처음으로 되감기
    document.querySelectorAll(".modal").forEach((modal) => {
        const video = modal.querySelector("video");

        if (!video) return;

        modal.addEventListener("shown.bs.modal", async () => {
            document.querySelectorAll(".modal video").forEach((otherVideo) => {
                if (otherVideo !== video) {
                    otherVideo.pause();
                    otherVideo.currentTime = 0;
                }
            });

            video.currentTime = 0;
            video.muted = false;

            try {
                await video.play();
            } catch (error) {
                video.muted = true;

                try {
                    await video.play();
                } catch (playError) {
                    console.warn("영상 자동재생이 차단되었습니다.", playError);
                }
            }
        });

        modal.addEventListener("hidden.bs.modal", () => {
            video.pause();
            video.currentTime = 0;
        });
    });

    // index.html 홈 "추천작" 섹션의 VIDEO 카드 3개 전용 재생 로직.
    // 처음엔 정지 썸네일 + 재생 버튼만 보이다가, 클릭하면 같은 카드 안에서
    // 실제 video(.home-video-player)가 나타나 처음부터 재생된다.
    // portfolio.html이 사용하는 위쪽 모달(.modal) 영상 재생 로직과는 완전히 분리되어 있어
    // 서로의 동작에 영향을 주지 않는다.
    const homeVideoCards = document.querySelectorAll(".home-video-card");

    function stopHomeVideoCard(card) {
        const player = card.querySelector(".home-video-player");
        if (!player) return;

        player.pause();
        player.currentTime = 0;
        player.removeAttribute("controls");
        card.classList.remove("is-playing");
    }

    homeVideoCards.forEach((card) => {
        const player = card.querySelector(".home-video-player");
        if (!player) return;

        card.addEventListener("click", async () => {
            // 이미 재생 중인 카드를 다시 클릭한 경우(=네이티브 컨트롤 클릭)는 무시하고
            // 브라우저 기본 video 컨트롤이 그대로 동작하게 둔다.
            if (card.classList.contains("is-playing")) return;

            // 다른 카드에서 재생 중이던 영상이 있으면 정지시키고 썸네일 상태로 되돌린다.
            homeVideoCards.forEach((otherCard) => {
                if (otherCard !== card) stopHomeVideoCard(otherCard);
            });

            card.classList.add("is-playing");
            player.currentTime = 0;
            player.muted = false;

            try {
                await player.play();
            } catch (error) {
                // 소리 포함 재생이 브라우저 정책으로 차단되면 음소거로라도 재생 시도
                player.muted = true;
                try {
                    await player.play();
                } catch (playError) {
                    console.warn("영상 재생이 차단되었습니다.", playError);
                }
            }

            player.setAttribute("controls", ""); // 재생 시작 후에는 컨트롤 사용 가능
        });

        // 영상이 끝까지 재생되면 다시 정지 썸네일 상태로 복귀
        player.addEventListener("ended", () => stopHomeVideoCard(card));
    });

    // about.html editorial page: fade-up on scroll (no effect on other pages)
    const aboutEditorialPage = document.querySelector(".about-editorial-page");
    if (aboutEditorialPage) {
        const fadeEls = aboutEditorialPage.querySelectorAll(".about-editorial-fade");
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (!prefersReducedMotion && "IntersectionObserver" in window) {
            const fadeObserver = new IntersectionObserver(
                (entries, observer) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add("is-visible");
                            entry.target.classList.remove("about-editorial-fade-pending");
                            observer.unobserve(entry.target);
                        }
                    });
                },
                { threshold: 0.15 }
            );
            // pre-hide right before observing: if this code never runs (JS error,
            // disabled JS), the CSS default keeps every section visible
            fadeEls.forEach((el) => {
                el.classList.add("about-editorial-fade-pending");
                fadeObserver.observe(el);
            });
        }
    }

    // Home About teaser: fade-up on scroll (independent of about.html's own fade system)
    const homeAboutFadeEls = document.querySelectorAll(".home-about-editorial-fade");
    if (homeAboutFadeEls.length) {
        const prefersReducedMotionHome = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (!prefersReducedMotionHome && "IntersectionObserver" in window) {
            const homeAboutFadeObserver = new IntersectionObserver(
                (entries, observer) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add("is-visible");
                            entry.target.classList.remove("home-about-editorial-fade-pending");
                            observer.unobserve(entry.target);
                        }
                    });
                },
                { threshold: 0.15 }
            );
            homeAboutFadeEls.forEach((el) => {
                el.classList.add("home-about-editorial-fade-pending");
                homeAboutFadeObserver.observe(el);
            });
        }
    }

    // portfolio.html: full project archive filter + search + counts.
    // Uses its own portfolio-page-* selectors so it never touches or
    // conflicts with the Home Portfolio section's filter logic above.
    const portfolioPageItems = document.querySelectorAll(".portfolio-page-item");
    if (portfolioPageItems.length) {
        const portfolioPageFilterButtons = document.querySelectorAll(".portfolio-page-filter-btn");
        const portfolioPageSearchInput = document.getElementById("portfolioPageSearchInput");
        const portfolioPageEmpty = document.getElementById("portfolioPageEmpty");
        let portfolioPageCurrentFilter = "all";

        const portfolioPageCounts = { all: portfolioPageItems.length, video: 0, web: 0, graphic: 0 };
        portfolioPageItems.forEach((item) => {
            const category = item.getAttribute("data-category");
            if (portfolioPageCounts[category] !== undefined) {
                portfolioPageCounts[category] += 1;
            }
        });
        document.querySelectorAll("[data-count-for]").forEach((el) => {
            const key = el.getAttribute("data-count-for");
            el.textContent = portfolioPageCounts[key] || 0;
        });

        function portfolioPageMatchesSearch(item, term) {
            if (!term) return true;
            const title = item.querySelector(".portfolio-page-title-sm");
            const desc = item.querySelector(".portfolio-page-desc");
            const category = item.querySelector(".portfolio-page-category");
            const tools = item.querySelector(".portfolio-page-tools");
            const haystack = [
                title ? title.textContent : "",
                desc ? desc.textContent : "",
                category ? category.textContent : "",
                tools ? tools.textContent : "",
                item.getAttribute("data-search-keywords") || "",
            ].join(" ").toLowerCase();
            return haystack.includes(term);
        }

        function portfolioPageApplyFilters() {
            const term = portfolioPageSearchInput ? portfolioPageSearchInput.value.trim().toLowerCase() : "";
            let visibleCount = 0;

            portfolioPageItems.forEach((item) => {
                const category = item.getAttribute("data-category");
                const inFilter = portfolioPageCurrentFilter === "all" || category === portfolioPageCurrentFilter;
                const inSearch = portfolioPageMatchesSearch(item, term);
                const visible = inFilter && inSearch;
                item.style.display = visible ? "block" : "none";
                if (visible) visibleCount += 1;
            });

            if (portfolioPageEmpty) {
                portfolioPageEmpty.hidden = visibleCount !== 0;
            }
        }

        portfolioPageFilterButtons.forEach((button) => {
            button.addEventListener("click", function () {
                portfolioPageFilterButtons.forEach((btn) => btn.classList.remove("active"));
                this.classList.add("active");
                portfolioPageCurrentFilter = this.getAttribute("data-filter");
                portfolioPageApplyFilters();
            });
        });

        if (portfolioPageSearchInput) {
            portfolioPageSearchInput.addEventListener("input", portfolioPageApplyFilters);
        }

        portfolioPageApplyFilters();
    }

    // portfolio.html: 영상 카드(썸네일 중앙) 재생 버튼 → 공용 modal(#portfolioVideoModal)에
    // data-video-src / data-video-title 값을 주입해서 연다. 자동재생과 닫을 때 pause+초기화는
    // 위쪽 범용 ".modal" 처리 로직(shown.bs.modal / hidden.bs.modal)이 그대로 담당한다.
    const portfolioThumbPlayButtons = document.querySelectorAll(".portfolio-thumb-play-btn");
    const portfolioVideoModalEl = document.getElementById("portfolioVideoModal");
    if (portfolioThumbPlayButtons.length && portfolioVideoModalEl && window.bootstrap) {
        const portfolioVideoModal = bootstrap.Modal.getOrCreateInstance(portfolioVideoModalEl);
        const portfolioVideoPlayer = portfolioVideoModalEl.querySelector("video");
        const portfolioVideoSource = portfolioVideoPlayer.querySelector("source");
        const portfolioVideoTitleEl = portfolioVideoModalEl.querySelector(".modal-title");

        portfolioThumbPlayButtons.forEach((btn) => {
            btn.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();

                portfolioVideoSource.src = btn.getAttribute("data-video-src") || "";
                portfolioVideoPlayer.load();
                if (portfolioVideoTitleEl) {
                    portfolioVideoTitleEl.textContent = btn.getAttribute("data-video-title") || "";
                }

                portfolioVideoModal.show();
            });
        });
    }

    // More Projects — 3D Coverflow slider (portfolio-video-1~5.html 하단).
    // Swiper 라이브러리는 해당 페이지에만 CDN으로 로드되므로, 컨테이너와
    // window.Swiper가 모두 있을 때만 초기화해 다른 페이지에는 영향이 없다.
    const moreProjectsSwiperEl = document.querySelector(".more-projects-swiper");
    if (moreProjectsSwiperEl && window.Swiper) {
        const prefersReducedMotionSlider = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        new Swiper(moreProjectsSwiperEl, {
            effect: prefersReducedMotionSlider ? "slide" : "coverflow",
            centeredSlides: true,
            loop: true,
            grabCursor: true,
            slideToClickedSlide: true,
            keyboard: { enabled: true },
            speed: prefersReducedMotionSlider ? 0 : 600,
            coverflowEffect: {
                rotate: 18,
                stretch: 0,
                depth: 170,
                modifier: 1.15,
                slideShadows: false,
            },
            pagination: {
                el: ".more-projects-pagination",
                clickable: true,
            },
            slidesPerView: 1.35,
            spaceBetween: 16,
            breakpoints: {
                768: { slidesPerView: 2.5, spaceBetween: 20 },
                1200: { slidesPerView: 4.6, spaceBetween: 22 },
                1600: { slidesPerView: 5.2, spaceBetween: 22 },
            },
        });
    }

    // contact form: mailto 링크로 방문자의 메일 앱을 열어 cej3968@gmail.com 앞으로 전송
    const contactForm = document.getElementById("contactForm");
    if (contactForm) {
        contactForm.addEventListener("submit", function (e) {
            e.preventDefault();

            const name = document.getElementById("contactName").value.trim();
            const email = document.getElementById("contactEmail").value.trim();
            const subject = document.getElementById("contactSubject").value.trim();
            const message = document.getElementById("contactMessage").value.trim();

            const mailSubject = subject || `포트폴리오 문의 - ${name}`;
            const mailBody =
                `이름: ${name}\n` +
                `이메일: ${email}\n\n` +
                `${message}`;

            const mailtoLink =
                "mailto:cej3968@gmail.com" +
                `?subject=${encodeURIComponent(mailSubject)}` +
                `&body=${encodeURIComponent(mailBody)}`;

            window.location.href = mailtoLink;
        });
    }

});
