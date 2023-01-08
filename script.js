'use strict';

// // prettier-ignore
// const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const btnSubmit = document.querySelector('form__btn');
const copyright = document.querySelector('.copyright');
let map, mapEvent;

// TODO USER STORY

/*
As a user I want:
1) Log running workouts with locations, distancem time, pace, steps, minutes.
    a) Need a map.
    b) Geolocation to display a map.
    c) Ask for a permission to obtain location.
    d) Form.
2) Log cycling workouts with location, distance, time, spee, elevation.
3) See all workouts at a glance.
4) See all workouts on a map.
5) See all workouts when i come back.
*/

// TODO ARCHITECTURE

/*
 1) Data storage. 
    - Class WORKOUT(distance, duration, coords + id and date), child class Running(cadence and pace), child class Cycling(speed and elevation).
    - Class App that will hold necessary functions as methods:
        a) _getPosition()
        b) _loadMap(positions) -> receive position
        c) _showForm() -> click on map 
        d) _toggleElevationField() -> toggle input
        e) _newWorkout() -> submit form
        f) workouts -> array holding all Running or Cycling objects
    - Running: location, distance, time, pace, steps/minutes(cadence).
    - Cycling: location, distance, time, speed, elevation gain.
*/

// BLOCK APP CLASS

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    // Get user's postion
    this._getPosition();
    // Get data from local storage
    this._getLocalStorage();
    // workout form submit and pin drop
    form.addEventListener('keyup', this._newWorkout.bind(this));
    // cycling vs running event listener
    inputType.addEventListener('change', this._toggleElevationField.bind(this));
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position.');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;

    // takes elemnt with ID = map, last number indicates zoom. this is a regular function call done by navigator.geolocation.getCurrentPosition
    // that is why we have to bind this keyword as regular fucntions have undefined this.
    this.#map = L.map('map').setView([latitude, longitude], this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // leaflet event listener
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(workout => {
      // REMEMBER
      // this step will be executed after map loads otherwise it will cause an error;
      this._renderWorkoutMarker(workout);
    });
  }

  _showForm(e) {
    this.#mapEvent = e;
    // console.log(this.#mapEvent);
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();
    if (e.keyCode === 13) {
      const validInputs = (...inputs) =>
        inputs.every(inp => Number.isFinite(inp));

      const positiveInputs = (...inputs) =>
        inputs.every(inp => Number(inp) > 0);

      const type = inputType.value;
      const distance = +inputDistance.value;
      const duration = +inputDuration.value;

      if (type === 'cycling') {
        const elevation = +inputElevation.value;
        if (
          !validInputs(distance, duration) ||
          !positiveInputs(distance, duration)
        ) {
          return alert('Please enter positive numbers.');
        }

        const workout = new Cycling(
          [this.#mapEvent.latlng.lat, this.#mapEvent.latlng.lng],
          distance,
          duration,
          elevation
        );

        this.#workouts.push(workout);
        this._renderWorkoutMarker(workout);
        this._renderWorkout(workout);
        this._hideForm();

        // Set local storage to all workouts
        this._setLocalStorage();
      }

      if (type === 'running') {
        const cadence = +inputCadence.value;
        if (
          !validInputs(distance, duration, cadence) ||
          !positiveInputs(distance, duration, cadence)
        ) {
          return alert('Please enter positive numbers.');
        }

        const workout = new Running(
          [this.#mapEvent.latlng.lat, this.#mapEvent.latlng.lng],
          distance,
          duration,
          cadence
        );

        this.#workouts.push(workout);
        this._renderWorkoutMarker(workout);
        this._renderWorkout(workout);
        this._hideForm();

        // Set local storage to all workouts
        this._setLocalStorage();
      }
    }
  }

  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
            <h2 class="workout__title">${workout.description}</h2>
            <div class="workout__details">
                <span class="workout__icon">${
                  workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
                }</span>
                <span class="workout__value">${workout.distance}</span>
                <span class="workout__unit">miles</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⏱</span>
                <span class="workout__value">${workout.duration}</span>
                <span class="workout__unit">min</span>
            </div>`;

    if (workout.type === 'running') {
      html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">miles/hour
            </span>
            </div>
            <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
            </div>
            </li>`;
    } else if (workout.type === 'cycling') {
      html += `<div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">miles/h</span>
        </div>
        <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">feet</span>
        </div>
        </li>`;
    }

    // inserts as a sibling
    form.insertAdjacentHTML('afterend', html);
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords, {
      draggable: true,
    })
      .addTo(this.#map)
      // shows text on a pin
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          // changes color on the left of the pop up
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _hideForm() {
    // display none is used to show new workout data right where the form was, otherwise the workouts will slide up.
    form.style.display = 'none';
    form.classList.add('hidden');
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';
    // Must return display grid otherwise form will not slide into viewany more
    setTimeout(function () {
      form.style.display = 'grid';
    }, 1000);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    // Leaflet method allows to locate pins and scroll into view
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });

    // REMEMBER
    // workout.click() will not work as this Object has been restored from localStorage and all methods are lost.
    // workout.click()
  }

  _setLocalStorage() {
    // REMEMBER
    // for small amount of data as localStorage is blocking
    // key value, where value is a string
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    // REMEMBER
    // returned object are no longer instances of Running or Cycling, meanings all methods are lost
    // that is a drawback of local storage
    // it is possible to restore a class
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(workout => {
      this._renderWorkout(workout);

      // REMEMBER
      // this method is executed in the very beginning befor map has been loaded and for this reason it will fail;
      // that is why this step should be moved to LoadMap();
      //   this._renderWorkoutMarker(workout);
    });
  }

  static reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();

// BLOCK WORKOUT CLASS REMEMBER IT IS BEST TO USE LIBRARIES TO GENERATE ID

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // miles
    this.duration = duration; // min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    // this.duration = duration;
    // this.distance = distance;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/miles
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    // this.distance = distance;
    // this.duration = duration;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // miles/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}
