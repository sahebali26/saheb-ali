
        (function() {
            'use strict';

            // ─── Console ───
            console.log('🚀 SAHEB Digital Hub — Premium Meesho Tools');
            console.log('📦 Free, private, browser-based tools for shipping label management.');

            // ─── Header scroll effect ───
            const header = document.getElementById('header');
            let lastScroll = 0;

            window.addEventListener('scroll', function() {
                const current = window.pageYOffset;
                if (current > 20) {
                    header.classList.add('scrolled');
                } else {
                    header.classList.remove('scrolled');
                }
                lastScroll = current;
            }, { passive: true });

            // ─── Smooth scroll for anchor links ───
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function(e) {
                    const href = this.getAttribute('href');
                    if (href === '#') return;
                    const target = document.querySelector(href);
                    if (target) {
                        e.preventDefault();
                        const offset = 80;
                        const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
                        window.scrollTo({ top, behavior: 'smooth' });
                    }
                });
            });

            // ─── Intersection Observer for reveal animations ───
            const revealElements = document.querySelectorAll('.reveal');

            if (revealElements.length > 0) {
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('visible');
                        }
                    });
                }, {
                    threshold: 0.15,
                    rootMargin: '0px 0px -40px 0px'
                });

                revealElements.forEach(el => observer.observe(el));
            }

            // ─── Tool card stagger ───
            const cards = document.querySelectorAll('.tool-card');
            cards.forEach((card, i) => {
                card.style.transitionDelay = (i * 0.08) + 's';
            });

        })();
