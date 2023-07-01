class PracticeKeys {

    constructor() {
        // User settings
        this.loopsTotal = localStorage.getItem('loopsTotal') ? parseInt(localStorage.getItem('loopsTotal')) : 2;
        this.beatsTotal = localStorage.getItem('beatsTotal') ? parseInt(localStorage.getItem('beatsTotal')) : 16;
        this.tempoMin = localStorage.getItem('tempoMin') ? parseInt(localStorage.getItem('tempoMin')) : 70;
        this.tempoMax = localStorage.getItem('tempoMax') ? parseInt(localStorage.getItem('tempoMax')) : 120;
        if(this.tempoMin > this.tempoMax) this.tempoMin = this.tempoMax;
        else if(this.tempoMax < this.tempoMin) this.tempoMax = this.tempoMin;
        this.maxTempoIn4th = localStorage.getItem('maxTempoIn4th') ? parseInt(localStorage.getItem('maxTempoIn4th')) : 240;
        this.keys = Array.isArray(JSON.parse(localStorage.getItem('keys'))) ? JSON.parse(localStorage.getItem('keys')) : [ 'C', 'E', 'G' ];
        this.durs = Array.isArray(JSON.parse(localStorage.getItem('durs'))) ? JSON.parse(localStorage.getItem('durs')) : [ 4, 8, 83, 16 ];
        this.fourths = localStorage.getItem('fourths') ? parseInt(localStorage.getItem('fourths')) : 4;
        this.mode = localStorage.getItem('mode') ? localStorage.getItem('mode') : 'loops';
        this.diceKey = localStorage.getItem('diceKey') ? JSON.parse(localStorage.getItem('diceKey')) : true;
        this.diceTempo = localStorage.getItem('diceTempo') ? JSON.parse(localStorage.getItem('diceTempo')) : true;
        this.diceDur = localStorage.getItem('diceDur') ? JSON.parse(localStorage.getItem('diceDur')) : true;
        // Internal settings
        this.randomTempoThreshold = 10; // Only if the difference between min and max tempo is higher than this integer, a random tempo change will be generated
        // State members
        this.firstRun = true;
        this.counterCurrent = 0;
        this.tempoCurrent = 0;
        this.beatCurrent = 0;
        this.beatsChange = 0;
        this.beatsMax = 0;
        this.beat4th = 0;
        this.playState = 0;
        this.metronomeInterval;
        this.keysPlayed = []
        this.keyCurrent = 0;
        this.durCurrent = 0;
        this.moveStartY = false;
        this.moveIsThrottled = false;
        this.touchX = false;
        this.touchedElementWidth = false;
        this.tempoChangeTimeout = false;
        this.elements = this.getElements();
        this.next = {}
        this.assets = {
            'notes': {
                '4': 'assets/note_4.svg',
                '8': 'assets/note_8.svg',
                '83': 'assets/note_8_triad.svg', // 8th triad
                '16': 'assets/note_16.svg',
            }
        }

        this.setEventListeners();
        this.updateScale();
        this.updateMode();
        this.updateDices();
    }

    getElements() {
        let elements = {
            'practiceKeys': document.getElementById('practice-keys'),
            'counter': document.querySelector('#practice-keys .current-grid .info-grid .counter'),
            'counterTitle': document.querySelector('#practice-keys .current-grid .titles-grid .counter'),
            'tempo': document.querySelector('#practice-keys .current-grid .info-grid .tempo'),
            'counterCurrent': document.querySelector('#practice-keys .current-grid .info-grid .counter .current'),
            'counterTotal': document.querySelector('#practice-keys .current-grid .info-grid .counter .total'),
            'tempoCurrent': document.querySelector('#practice-keys .current-grid .info-grid .tempo'),
            'keyCurrent': document.querySelector('#practice-keys .current-grid .info-grid .key'),
            'durCurrent': document.querySelector('#practice-keys .current-grid .info-grid .dur'),
            'beatsGrid': document.querySelector('#practice-keys .current-grid .beats-grid'),
            'practiceGrid': document.querySelector('#practice-keys .practice-grid'),
            'tempoNext': document.querySelector('#practice-keys .next-grid .info-grid .tempo'),
            'keyNext': document.querySelector('#practice-keys .next-grid .info-grid .key'),
            'durNext': document.querySelector('#practice-keys .next-grid .info-grid .dur'),
            'playPauseBtn': document.querySelector('#practice-keys .play-pause-btn'),
            'audio4th': document.querySelector('#practice-keys .audio4th'),
            'audioSubs': document.querySelector('#practice-keys .audiosubs'),
            'beatLastActive': false,
            'keySettingsGrid': document.querySelector('#practice-keys > .key-settings-grid'),
            'keySettingsCloseBtn': document.querySelector('#practice-keys > .key-settings-grid .close'),
            'keySettingsResetBtn': document.querySelector('#practice-keys > .key-settings-grid .reset'),
            'keySettingsAllBtn': document.querySelector('#practice-keys > .key-settings-grid .all'),
            'keyGroups': document.querySelectorAll('#practice-keys > .key-settings-grid .group'),
            'previewKey': document.querySelector('#practice-keys .next-grid .preview.key'),
            'previewTempo': document.querySelector('#practice-keys .next-grid .preview.tempo'),
            'previewDur': document.querySelector('#practice-keys .next-grid .preview.dur'),
        }
        return elements;
    }

    setEventListeners() {
        this.elements.playPauseBtn.addEventListener('click', e => this.onPlayPauseBtnClick(e));
        // User swap loops with beats
        this.elements.counter.addEventListener('click', e => this.onCounterClick(e));
        // User change number total loops or beats
        this.elements.counter.addEventListener('touchstart', e => { this.moveStartY = e.touches[0].pageY; });
        this.elements.counter.addEventListener('touchmove', e => this.onCounterTouchMove(e));
        // User change tempo min/max
        this.elements.tempo.addEventListener('touchstart', e => {
            this.moveStartY = e.touches[0].pageY;
            this.touchX = e.touches[0].clientX;
            this.touchedElementWidth = e.target.offsetWidth;
        });
        this.elements.tempo.addEventListener('touchmove', e => this.onTempoTouchMove(e));
        // User selection for keys/chords
        this.elements.keyCurrent.addEventListener('click', e => this.onKeyCurrentClick(e));
        this.elements.keySettingsCloseBtn.addEventListener('click', e => this.onKeySettingsCloseBtn(e));
        this.elements.keySettingsResetBtn.addEventListener('click', e => this.onKeySettingsResetBtn(e));
        this.elements.keySettingsAllBtn.addEventListener('click', e => this.onKeySettingsAllBtn(e));
        this.elements.keyGroups.forEach(group=>{
            group.querySelectorAll('.note, .flat, .sharp').forEach(element=>{
                element.addEventListener('click', e => this.onKeyClick(e));
            });
        });
        // Block user from scrolling.
        this.elements.practiceGrid.addEventListener('wheel', function(e) { e.preventDefault(); }, { passive: false });
        this.elements.practiceGrid.addEventListener('touchmove', function(e) { e.preventDefault(); }, { passive: false });
        // User enable/disable dice options
        this.elements.previewKey.addEventListener('click', e => this.onPreviewKeyClick(e));
        this.elements.previewTempo.addEventListener('click', e => this.onPreviewTempoClick(e));
        this.elements.previewDur.addEventListener('click', e => this.onPreviewDurClick(e));
        // Other
        window.addEventListener('resize', () => { this.updateScale(); });
    }

    onPlayPauseBtnClick(e) {
        if(this.playState == 0) this.play();
        else this.stop();
    }

    onCounterTouchMove(e) {
        if(!this.moveIsThrottled) {
            this.moveIsThrottled = true;
            setTimeout(() => { this.moveIsThrottled = false; }, 250);
            let moveEndY = e.touches[0].pageY;
            let change = 0;
            moveEndY - this.moveStartY > 0 ? change = -1 : change = 1;
            this.updateCounterTotalChange(change, this.mode == 'loops' ? false : true);
        }
    }

    onCounterClick(e) {
        this.mode = this.mode == 'loops' ? 'beats' : 'loops';
        this.updateMode();
    }

    onTempoTouchMove(e) {
        let halfWidth = this.touchedElementWidth / 2;
        let relativeTouchX = this.touchX - e.target.getBoundingClientRect().left;
        let type = relativeTouchX < halfWidth ? 'min' : 'max';
        let moveEndY = e.touches[0].pageY;
        moveEndY - this.moveStartY > 0 ? this.updateTempoChange(type, -1) : this.updateTempoChange(type, 1);
    }

    onKeyCurrentClick(e) {
        // Set active states
        this.elements.keySettingsGrid.querySelectorAll('.active').forEach(element=>{ element.classList.remove('active'); });
        this.elements.keyGroups.forEach(group=>{
            let groupKey = group.dataset.key;
            this.keys.forEach(key=>{
                let keys = key.split('')
                key = keys[0]
                let accidental = keys.length == 2 ? keys[1] : false;
                if(key == groupKey) {
                    if(accidental) {
                        if(accidental == '#') group.querySelector('.sharp').classList.add('active');
                        else if(accidental == 'b') group.querySelector('.flat').classList.add('active');
                    }
                    else group.querySelector('.note').classList.add('active');
                }
            });
        });
        // Show screen
        this.elements.practiceKeys.childNodes.forEach(node=>{
            try { node.classList.add('hidden'); }
            catch {}
        });
        this.elements.keySettingsGrid.classList.remove('hidden');
    }

    onKeySettingsCloseBtn(e) {
        this.elements.practiceKeys.childNodes.forEach(node=>{
            try { node.classList.add('hidden'); }
            catch {}
        });
        this.elements.practiceGrid.classList.remove('hidden');
        localStorage.setItem('keys', JSON.stringify(this.keys));
        this.updateNext();
    }

    onKeySettingsResetBtn(e) {
        this.elements.keySettingsGrid.querySelectorAll('.active').forEach(element=>{
            element.classList.remove('active');
        });
        this.keys = [];
    }

    onKeySettingsAllBtn(e) {
        let keys = [];
        this.elements.keyGroups.forEach(group=>{
            let groupKey = group.dataset.key;
            keys.push(groupKey, `${groupKey}#`, `${groupKey}b`);
        });
        this.elements.keySettingsGrid.querySelectorAll('.note, .flat, .sharp').forEach(element=>{
            element.classList.add('active');
        });
        this.keys = keys;
    }

    onKeyClick(e) {
        let element = e.currentTarget;
        let groupElement = element.closest('.group');
        let key = groupElement.dataset.key;
        let clickedKey = '';
        if(element.classList.contains('note')) clickedKey = key;
        else if(element.classList.contains('flat')) clickedKey = `${key}b`;
        else if(element.classList.contains('sharp')) clickedKey =`${key}#`;
        if(this.keys.includes(clickedKey)) {
            this.keys = this.keys.filter(item => item !== clickedKey);
            element.classList.remove('active');
        }
        else {
            this.keys.push(clickedKey);
            element.classList.add('active');
        }
    }

    onPreviewKeyClick(e) {
        this.diceKey = this.diceKey ? false : true;
        localStorage.setItem('diceKey', JSON.stringify(this.diceKey));
        this.updateDices();
    }

    onPreviewTempoClick(e) {
        this.diceTempo = this.diceTempo ? false : true;
        localStorage.setItem('diceTempo', JSON.stringify(this.diceTempo));
        this.updateDices();
    }

    onPreviewDurClick(e) {
        this.diceDur = this.diceDur ? false : true;
        localStorage.setItem('diceDur', JSON.stringify(this.diceDur));
        this.updateDices();
    }

    updateTempoChange(type, num) {
        clearTimeout(this.tempoChangeTimeout);
        this.tempoChangeTimeout = setTimeout(()=>{
            this.elements.tempo.innerHTML = this.tempoCurrent;
            this.elements.tempo.classList.remove('error');
        }, 1000)
        let error = false;
        if(type == 'min') {
            this.tempoMin += num;
            if(this.tempoMin < 10) {
                this.tempoMin = 10;
                error = true;
            }
            if(this.tempoMin >= this.tempoMax) {
                this.tempoMin = this.tempoMax;
                error = true;
            }
            this.elements.tempo.classList.remove('error');
            this.elements.tempo.innerHTML = `Minimum<br>${this.tempoMin}<br>`;
            localStorage.setItem('tempoMin', this.tempoMin);
        }
        else if(type == 'max') {
            this.tempoMax += num;
            if(this.tempoMax > 400) {
                this.tempoMax = 400;
                error = true;
            }
            if(this.tempoMax < this.tempoMin) {
                this.tempoMax = this.tempoMin;
                error = true;
            }
            this.elements.tempo.classList.remove('error');
            this.elements.tempo.innerHTML = `Maximum<br>${this.tempoMax}`;
            localStorage.setItem('tempoMax', this.tempoMax);
        }
        if(error) {
            this.elements.tempo.classList.add('error');
        }
        this.updateNext('tempo');
    }

    play() {
        this.playState = 1;
        this.updateCurrentFromNext();
        this.updateNext();
        this.elements.playPauseBtn.textContent = 'Stop'
    }

    stop() {
        this.playState = 0;
        this.elements.playPauseBtn.textContent = 'Start'
        this.reset();
    }

    reset() {
        clearInterval(this.metronomeInterval);
        this.setLastBeatInactive();
        this.beatCurrent = 0;
        if(this.beatsChange != 0) this.updateCounterTotalChange(this.beatsChange);
        this.elements.beatLastActive = false;
        this.elements.beatsGrid.innerHTML = '';
        this.updateCounterCurrent(true);
    }

    updateNext(force=false) {
        if(!this.firstRun && !this.diceKey && !this.diceTempo && !this.diceDur) return;
        let tempo = this.firstRun ? this.getRandomTempo() : this.tempoCurrent;
        if(this.diceTempo) {
            if(this.tempoMin != this.tempoMax && this.tempoMax - this.tempoMin > this.randomTempoThreshold) {
                for(let i = 0; i < 50; i++) {
                    tempo = this.getRandomTempo();
                    if(Math.abs(this.tempoCurrent - tempo) >= this.randomTempoThreshold) break;
                }
            }
            else {
                console.log('Tempo difference is too small to randomize it.')
                tempo = this.getRandomTempo();
            }
        }
        let dur = this.durCurrent;
        if(this.diceDur || this.firstRun) dur = this.getRandomDur();
        let key = this.getNextUniqueKey(this.keys, this.keysPlayed);

        // Build possible dices
        let dices = []
        if(this.diceKey && key != this.keyCurrent) dices.push(0);
        if(this.diceTempo && tempo != this.tempoCurrent) dices.push(2);
        if(this.diceDur && dur != this.durCurrent) dices.push(4);
        if((this.diceKey && key != this.keyCurrent) && (this.diceDur && dur != this.durCurrent)) dices.push(1)
        if((this.diceTempo && tempo != this.tempoCurrent) && (this.diceKey && this.diceKey && key != this.keyCurrent)) dices.push(3)
        if(this.firstRun) this.next = { 'key': key, 'dur': dur, 'tempo': tempo };
        else {
            // Dice what should be next
            let dice = dices[Math.floor(Math.random() * dices.length)];
            if(force=='tempo' && tempo != this.tempoCurrent) dice = 2;
            if(dice == 0) { // New key
                this.next = { 'key': key, 'dur': this.durCurrent, 'tempo': this.tempoCurrent }
                this.setNextOpacities(key == this.keyCurrent ? 0 : 1, 0, 0);
            }
            else if(dice == 1) { // New key and dur
                this.next = { 'key': key, 'dur': dur, 'tempo': this.tempoCurrent }
                this.setNextOpacities(key == this.keyCurrent ? 0 : 1, dur == this.durCurrent ? 0 : 1, 0);
            }
            else if(dice == 2) { // New tempo
                this.next = { 'key': this.keyCurrent, 'dur': this.durCurrent, 'tempo': tempo }
                this.setNextOpacities(0, 0, tempo == this.tempoCurrent ? 0 : 1);
            }
            else if(dice == 3) { // New tempo and key
                this.next = { 'key': key, 'dur': this.durCurrent, 'tempo': tempo }
                this.setNextOpacities(key == this.keyCurrent ? 0 : 1, 0, tempo == this.tempoCurrent ? 0 : 1);
            }
            else if(dice == 4) { // New dur
                this.next = { 'key': this.keyCurrent, 'dur': dur, 'tempo': this.tempoCurrent }
                this.setNextOpacities(0, 1, 0);
            }
        }
        if(this.firstRun) this.setNextOpacities(1, 1, 1);
        this.firstRun = false;
        this.updateKeyNext(this.next.key);
        this.updateDurNext(this.next.dur);
        this.updateTempoNext(this.next.tempo);
    }

    setNextOpacities(key, dur, tempo) {
        if(key==0) this.elements.keyNext.classList.add('old');
        else this.elements.keyNext.classList.remove('old');
        if(dur==0) this.elements.durNext.classList.add('old');
        else this.elements.durNext.classList.remove('old');
        if(tempo==0) this.elements.tempoNext.classList.add('old');
        else this.elements.tempoNext.classList.remove('old');
    }

    updateCurrentFromNext() {
        this.reset();
        this.updateKeyCurrent(this.next.key)
        this.updateDurCurrent(this.next.dur)
        this.updateTempoCurrent(this.next.tempo)
        this.updateBeatCurrent();
    }

    updateBeatCurrent() {
        let dur = this.durCurrent;
        if(dur==83) dur=12;
        let interval = ((1 / (this.tempoCurrent / 60)) * 1000) / (dur/4);
        this.beatsInterval();
        this.metronomeInterval = setInterval(() => this.beatsInterval(), interval)
    }

    beatsInterval() {
        if((this.mode=='loops' && this.beatCurrent >= this.beatsMax) || (this.mode=='beats' && this.beatCurrent >= this.beatsTotal)) {
            this.beatCurrent = 1;
            this.updateCounterCurrent();
            if((this.mode == 'loops' && this.counterCurrent == 1) || this.mode=='beats') {
                this.updateCurrentFromNext();
                this.updateNext();
                return;
            }
        }
        else {
            if(this.mode == 'beats') this.updateCounterCurrent();
            this.beatCurrent += 1;
        }
        this.setLastBeatInactive();
        let beatCurrentElement = this.elements.beatsGrid.querySelector(`.sub-beats-grid > div:nth-child(${this.beatCurrent})`);
        beatCurrentElement.classList.toggle('active');
        if(this.durCurrent == 4) this.playAudio4th()
        else if(this.beatCurrent % this.beat4th-1 == 0) this.playAudio4th();
        else this.playAudioSubs()
        this.elements.beatLastActive = beatCurrentElement;
    }

    setLastBeatInactive() {
        if(this.elements.beatLastActive) this.elements.beatLastActive.classList.toggle('active');
    }

    playAudio4th() {
        if(!this.elements.audio4th.paused) {
            this.elements.audio4th.pause();
            this.elements.audio4th.currentTime = 0;
        }
        this.elements.audio4th.play();
    }

    playAudioSubs() {
        if(!this.elements.audioSubs.paused) {
            this.elements.audioSubs.pause();
            this.elements.audioSubs.currentTime = 0;
        }
        this.elements.audioSubs.play();
    }

    updateMode() {
        if(this.playState) this.updateCurrentFromNext();
        this.updateNext();
        if(this.mode == 'loops') {
            this.elements.counterTitle.textContent = 'Loops';
            this.updateCounterTotal(this.loopsTotal);
        }
        else if(this.mode == 'beats') {
            this.elements.counterTitle.textContent = 'Beats';
            this.updateCounterTotal(this.beatsTotal);
        }
        localStorage.setItem('mode', this.mode);
    }

    updateCounterCurrent(reset=false) {
        this.counterTotal = this.mode == 'loops' ? this.loopsTotal : this.beatsTotal;
        if(reset) this.counterCurrent = this.mode == 'loops' ? 1 : 0;
        else if(this.counterCurrent >= this.counterTotal) this.counterCurrent = 1;
        else this.counterCurrent += 1;
        this.elements.counterCurrent.textContent = this.counterCurrent;
    }

    updateCounterTotal(count) {
        if(this.mode == 'loops') {
            this.loopsTotal = count;
            localStorage.setItem('loopsTotal', this.loopsTotal);
        }
        else if(this.mode == 'beats') {
            this.beatsTotal = count;
            localStorage.setItem('beatsTotal', this.beatsTotal);
        }
        this.elements.counterTotal.textContent = count;
    }

    updateCounterTotalChange(num, waitForNext=false) {
        if(this.mode == 'loops') {
            if(this.loopsTotal + num >= 1) this.loopsTotal += num;
            this.elements.counterTotal.textContent = this.loopsTotal;
            localStorage.setItem('loopsTotal', this.loopsTotal);
        }
        else if(this.mode == 'beats') {
            if(waitForNext) this.beatsChange += num;
            else if(this.beatsTotal + num >= 1) {
                this.beatsTotal += num;
                this.beatsChange = 0;
            }
            this.elements.counterTotal.textContent = this.beatsTotal + this.beatsChange;
            localStorage.setItem('beatsTotal', this.beatsTotal);
        }
    }

    updateKeyCurrent(key) {
        this.keyCurrent = key;
        this.elements.keyCurrent.textContent = String(key).replace('b', '♭').replace('#', '♯');
        this.keysPlayed.push(key)
    }

    updateKeyNext(key) {
        this.elements.keyNext.textContent = String(key).replace('b', '♭').replace('#', '♯');
    }

    updateDurCurrent(dur) {
        this.durCurrent = dur;
        this.beatsMax = (dur/4)*this.fourths
        this.beat4th = dur/4
        if(dur == 83) {
            this.beatsMax = this.fourths * 3
            this.beat4th = 3
        }
        let imgSrc = this.assets.notes[String(dur)];
        this.elements.durCurrent.innerHTML = `
            <img src="${imgSrc}">
        `;
        this.updateBeatsGrid(dur);
    }

    updateDurNext(dur) {
        let imgSrc = this.assets.notes[String(dur)];
        this.elements.durNext.innerHTML = `
            <img src="${imgSrc}">
        `;
    }

    updateTempoCurrent(tempo) {
        this.tempoCurrent = tempo;
        this.elements.tempoCurrent.textContent = tempo;
    }

    updateTempoNext(tempo) {
        this.elements.tempoNext.textContent = tempo;
    }

    updateBeatsGrid(dur) {
        let subElement = document.createElement('div');
        subElement.classList.add('sub-beats-grid');
        let beatElements = '';
        let fourths = this.mode == 'loops' ? this.fourths : this.calcFourthsFromBeats(dur);
        for(let i = 1; i <= fourths; i++) {
            beatElements += `<div class="main">${i}</div>`;
            if(dur == 83) beatElements += '<div class="sub"></div>'.repeat(2);
            else beatElements += '<div class="sub"></div>'.repeat((dur / 4)-1);
        }
        subElement.innerHTML = beatElements;
        this.elements.beatsGrid.appendChild(subElement);
    }

    calcFourthsFromBeats(dur) {
        if(dur == 83) dur = 12;
        let fourths = Math.ceil(this.beatsTotal * (4/dur));
        return fourths;
    }

    getNextUniqueKey(array1, array2) {
        // Gets a music key which was not already played since the last reset
        let filteredArray = array1.filter(function(item) {
            return array2.indexOf(item) === -1;
        });
        if (filteredArray.length === 0) {
            this.keysPlayed = [];
            return 'C';
        }
        let randomIndex = Math.floor(Math.random() * filteredArray.length);
        let key = filteredArray[randomIndex];
        return key ? key : 'C';
    }

    getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    getRandomTempo() {
        return this.getRandomInt(this.tempoMin, this.tempoMax);
    }

    getRandomDur() {
        return this.durs[Math.floor(Math.random() * this.durs.length)];
    }

    updateScale() {
        this.elements.practiceKeys.style.transform = 'scale(1)';
        // Set margins
        let lr = (window.innerWidth-this.elements.practiceKeys.getBoundingClientRect().width) / 2
        this.elements.practiceKeys.style.marginLeft = `${lr}px`;
        // Set scaling
        let scaleX = window.innerWidth / this.elements.practiceKeys.offsetWidth; // 800
        let scaleY = window.innerHeight / this.elements.practiceKeys.offsetHeight; // 360
        let scale = Math.min(scaleX, scaleY);
        this.elements.practiceKeys.style.transform = 'scale(' + scale + ')';

        this.scrollToPractice();
    }

    updateDices() {
        if(this.diceKey) this.elements.previewKey.classList.remove('disabled');
        else {
            this.elements.previewKey.classList.add('disabled')
            if(this.keyCurrent != 0) this.next.key = this.keyCurrent;
        }
        if(this.diceTempo) this.elements.previewTempo.classList.remove('disabled');
        else {
            this.elements.previewTempo.classList.add('disabled')
            if(this.tempoCurrent != 0) this.next.tempo = this.tempoCurrent;
        }
        if(this.diceDur) this.elements.previewDur.classList.remove('disabled');
        else {
            this.elements.previewDur.classList.add('disabled')
            if(this.durCurrent != 0) this.next.dur = this.durCurrent;
        }
    }

    scrollToPractice() {
        // Scroll to the practice container. This is a hack to prevent mobile browsers from showing the address bar.
        window.scrollTo({
            top: (this.elements.practiceKeys.getBoundingClientRect().top + window.scrollY) - (window. innerHeight / 2) + (this.elements.practiceKeys.getBoundingClientRect().height / 2),
            behavior: 'smooth'
        });
    }

}

document.addEventListener("DOMContentLoaded", function() {
    new PracticeKeys();
});
