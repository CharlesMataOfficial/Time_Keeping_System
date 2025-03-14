window.addEventListener('load', function () {
    (function ($) {
        DateTimeShortcuts.clockHours.default_ = [
            ['6:00 AM', 6],
            ['7:00 AM', 7],
            ['8:00 AM', 8],
            ['9:00 AM', 9],
            ['4:00 PM', 16],
            ['5:00 PM', 17],
            ['6:00 PM', 18],
            ['7:00 PM', 19],
        ];

        DateTimeShortcuts.handleClockQuicklink = function (num, val) {
            let d;
            if (val == -1) {
                d = DateTimeShortcuts.now();
            } else {
                const h = val | 0;
                const m = (val - h) * 60;
                d = new Date(1970, 1, 1, h, m, 0, 0);
            }
            DateTimeShortcuts.clockInputs[num].value = d.strftime(get_format('TIME_INPUT_FORMATS')[0]);
            DateTimeShortcuts.clockInputs[num].focus();
            DateTimeShortcuts.dismissClock(num);
        };
    })(django.jQuery);
});