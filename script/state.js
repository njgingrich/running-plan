import { PLANS } from '../plans/index.js';

/**
 * @typedef {Object} PaceDefinition
 * @property {string} description - Description of when to use this pace
 * @property {'race'|'time'|'pct'} paceType - Type of pace calculation
 * @property {number} [fast] - Fast end of pace range (for time/pct types)
 * @property {number} [slow] - Slow end of pace range (for time/pct types)
 * @property {number} [multiplier] - Pace multiplier (for time type)
 */

/**
 * @typedef {Object} WorkoutTypes
 * @property {string} rest - Description for rest workouts
 * @property {string} general_aerobic - Description for general aerobic workouts
 * @property {string} lactate_threshold - Description for lactate threshold workouts
 * @property {string} interval - Description for interval workouts
 * @property {string} recovery - Description for recovery workouts
 * @property {string} long_run - Description for long run workouts
 * @property {string} race - Description for race workouts
 */

/**
 * @typedef {Object} Workout
 * @property {'rest'|'general_aerobic'|'lactate_threshold'|'interval'|'recovery'|'long_run'|'race'} type - Type of workout
 * @property {number} distance - Distance of the workout
 * @property {'mi'|'km'} distanceUnit - Unit of distance measurement
 * @property {string} [notes] - Additional notes or instructions for the workout
 */

/**
 * @typedef {Object} Plan
 * @property {string} id - Unique identifier for the plan
 * @property {string} name - Display name of the training plan
 * @property {string} description - Detailed description of the training plan
 * @property {'marathon'|'half-marathon'|'10k'|'5k'} distance - Target race distance
 * @property {WorkoutTypes} types - Mapping of workout type codes to descriptions
 * @property {Object.<string, PaceDefinition>} paces - Definitions of different training paces
 * @property {Workout[][]} weeks - Array of weeks, each containing an array of daily workouts
 */

/**
 * Retrieves the current state from URL query parameters
 * @returns {Object} An object containing the plan, race date, and goal pace
 * @property {string|null} plan - The ID of the selected training plan
 * @property {string|null} raceDate - The target race date as a YYYY-MM-DD string
 * @property {string|null} goalPaceSeconds - The target goal pace in seconds
 * 
 * @returns {Object}
 */
function getUrlState() {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get('plan');
    const raceDate = params.get('raceDate');
    const goalPaceSeconds = params.get('marathonPace');
    return {
        plan,
        raceDate,
        goalPaceSeconds,
    };
}

/**
 * Updates the URL query parameters with new state values.
 * If a value is null, the parameter is removed from the URL.
 * If a value is undefined, the parameter is not changed.
 *
 * @param {string|null} plan - The ID of the training plan to set
 * @param {string|null} raceDate - The race date to set as a YYYY-MM-DD string
 * @param {string|null} goalPaceSeconds - The goal pace in seconds to set
 */
function updateUrlState({plan = undefined, raceDate = undefined, goalPaceSeconds = undefined} = {}) {
    const params = new URLSearchParams(window.location.search);

    if (plan) {
        params.set('plan', plan);
    } else if (plan === null) {
        params.delete('plan');
    }
    if (raceDate) {
        params.set('raceDate', raceDate);
    } else if (raceDate === null) {
        params.delete('raceDate');
    }
    if (goalPaceSeconds) {
        params.set('goalPaceSeconds', goalPaceSeconds);
    } else if (goalPaceSeconds === null) {
        params.delete('goalPaceSeconds');
    }

    if (params.toString() !== window.location.search) {
        if (params.toString() === '') {
            window.history.replaceState({}, '', window.location.pathname);
        } else {
            window.history.replaceState({}, '', `?${params.toString()}`);
        }
    }

    return params;
}

/**
 * Represents the application state, managing plan details, race date, and pace goals
 * State is persisted in URL parameters and can be initialized from them
 */
export class State {
    /** @type {URLSearchParams} The URL search parameters */
    #params;
    /** @type {string|null} The ID of the selected training plan */
    #_planId;
    /** @type {string|null} The target race date as a YYYY-MM-DD string */
    #_raceDate;
    /** @type {number|null} The target goal pace in seconds */
    #_goalPaceSeconds;

    /**
     * Creates a new State instance
     * @param {string|null} plan - Initial training plan (falls back to URL state if null)
     * @param {Temporal|null} raceDate - Initial race date (falls back to URL state if null)
     * @param {number|null} goalPaceSeconds - Initial goal pace in seconds (falls back to URL state if null)
     */
    constructor(plan = null, raceDate = null, goalPaceSeconds = null) {
        const urlState = getUrlState();
        this._planId = plan || urlState.plan;
        this._raceDate = raceDate?.toString() || urlState.raceDate;
        this._goalPaceSeconds = goalPaceSeconds || urlState.goalPaceSeconds;

        this.#params = updateUrlState({
            plan: this._planId,
            raceDate: this._raceDate,
            goalPaceSeconds: this._goalPaceSeconds,
        });
    }

    /**
     * Gets the current training plan ID
     * @returns {string|null} The ID of the selected training plan
     */
    get planId() {
        return this._planId;
    }

    /**
     * Sets the ID of the selected training plan
     * @param {string|null} planId - The ID of the training plan to set
     */
    set planId(planId) {
        this._planId = planId;
        this.#params = updateUrlState({plan: this._planId});
    }

    /**
     * Gets the selected training plan
     * @returns {Plan|null} The training plan object
     */
    get plan() {
        return PLANS[this._planId];
    }

    /**
     * Gets the race date as a Temporal.PlainDate object
     * @returns {Temporal.PlainDate|null} The target race date
     */
    get raceDate() {
        if (!this._raceDate) {
            return null;
        }
        return Temporal.PlainDate.from(this._raceDate);
    }

    /**
     * Sets the race date as a Temporal.PlainDate object
     * @param {Temporal.PlainDate} raceDate - The race date to set
     */
    set raceDate(raceDate) {
        if (!raceDate) {    
            this._raceDate = null;
        } else {
            this._raceDate = raceDate.toString();
        }
        this.#params = updateUrlState({raceDate: this._raceDate});
    }

    /**
     * Gets the goal marathon pace in seconds
     * @returns {number|null} The goal pace in seconds
     */
    get goalPaceSeconds() {
        return this._goalPaceSeconds;
    }

    /**
     * Sets the goal marathon pace in seconds
     * @param {number|null} goalPaceSeconds - The goal pace in seconds to set
     */
    set goalPaceSeconds(goalPaceSeconds) {
        this._goalPaceSeconds = goalPaceSeconds;
        this.#params = updateUrlState({goalPaceSeconds: this._goalPaceSeconds});
    }
}
