// --- CONSTANTS ---

let slideIndex = 1;
let touchstartX = 0;
let touchendX = 0;

// --- LISTENERS ---

document.querySelector(".carousel").addEventListener('touchstart', e => {
    touchstartX = e.changedTouches[0].screenX
})

document.querySelector(".carousel").addEventListener('touchend', e => {
    touchendX = e.changedTouches[0].screenX
    checkDirection()
})

window.addEventListener("resize", (event) => {
    let slides = document.getElementsByClassName("carousel-slide");
    if (screen.width < 1000) {
        for (i = 0; i < slides.length; i++) {
            slides[i].style.display = "none";
        }
        showSlides(slideIndex);
    } else {
        for (i = 0; i < slides.length; i++) {
            slides[i].style.display = "flex";
        }
    }
});

// --- FUNCTIONS ---

function checkDirection() {
    if (touchendX < touchstartX) plusSlides(1);
    if (touchendX > touchstartX) plusSlides(-1);
}

// Next/previous controls
function plusSlides(n) {
    showSlides(slideIndex += n);
}

// Dot image control
function currentSlide(n) {
    showSlides(slideIndex = n);
}

function showSlides(n) {
    if (screen.width > 1000) return;
    let i;
    let slides = document.getElementsByClassName("carousel-slide");
    let dots = document.getElementsByClassName("dot");
    if (n > slides.length) {
        slideIndex = 1
    }
    if (n < 1) {
        slideIndex = slides.length
    }
    for (i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";
    }
    for (i = 0; i < dots.length; i++) {
        dots[i].className = dots[i].className.replace(" active", "");
    }
    slides[slideIndex - 1].style.display = "flex";
    dots[slideIndex - 1].className += " active";
}

showSlides(slideIndex);

function enableEnterKey(input) {

    /* Store original event listener */
    const _addEventListener = input.addEventListener

    const addEventListenerWrapper = (type, listener) => {
        if (type === 'keydown') {
            /* Store existing listener function */
            const _listener = listener
            listener = (event) => {
                /* Simulate a 'down arrow' keypress if no address has been selected */
                const suggestionSelected = document.getElementsByClassName('pac-item-selected').length
                if (event.key === 'Enter' && !suggestionSelected) {
                    const e = new KeyboardEvent('keydown', {
                        key: 'ArrowDown',
                        code: 'ArrowDown',
                        keyCode: 40,
                    })
                    _listener.apply(input, [e])
                }
                _listener.apply(input, [event])
            }
        }
        _addEventListener.apply(input, [type, listener])
    }

    input.addEventListener = addEventListenerWrapper
}

