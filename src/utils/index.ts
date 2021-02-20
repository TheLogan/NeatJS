/**
 * This file was borrowed from P5
 * https://github.com/processing/p5.js/blob/main/src/math/random.js
 * This project isn't meant to run directly in the browser, therefore the P5 project fails to be imported (it is dependent on window)
 */

// variables used for random number generators
const randomStateProp = "_lcg_random_state";
// Set to values from http://en.wikipedia.org/wiki/Numerical_Recipes
// m is basically chosen to be large (as it is the max period)
// and for its relationships to a and c
const m = 4294967296;
// a - 1 should be divisible by m's prime factors
const a = 1664525;
// c and m should be co-prime
const c = 1013904223;
let y2 = 0;

let _gaussian_previous;

// Linear Congruential Generator that stores its state at instance[stateProperty]
export const _lcg = function (stateProperty) {
  // define the recurrence relationship
  this[stateProperty] = (a * this[stateProperty] + c) % m;
  // return a float in [0, 1)
  // we've just used % m, so / m is always < 1
  return this[stateProperty] / m;
};

export const _lcgSetSeed = function (stateProperty, val) {
  // pick a random seed if val is undefined or null
  // the >>> 0 casts the seed to an unsigned 32-bit integer
  this[stateProperty] = (val == null ? Math.random() * m : val) >>> 0;
};

export const randomSeed = function (seed) {
  _lcgSetSeed(randomStateProp, seed);
  _gaussian_previous = false;
};

export const random = function (min: number | any[], max?: number | any[]) {
  let rand;

  if (this[randomStateProp] != null) {
    rand = _lcg(randomStateProp);
  } else {
    rand = Math.random();
  }
  if (typeof min === "undefined") {
    return rand;
  } else if (typeof max === "undefined") {
    if (min instanceof Array) {
      return min[Math.floor(rand * min.length)];
    } else {
      return rand * min;
    }
  } else {
    if (min > max) {
      const tmp = min;
      min = max;
      max = tmp;
    }

    //@ts-ignore
    return rand * (max - min) + min;
  }
};

export const randomGaussian = function (mean?: number, sd: number = 1) {
  let y1, x1, x2, w;
  if (_gaussian_previous) {
    y1 = y2;
    _gaussian_previous = false;
  } else {
    do {
      x1 = random(2) - 1;
      x2 = random(2) - 1;
      w = x1 * x1 + x2 * x2;
    } while (w >= 1);
    w = Math.sqrt((-2 * Math.log(w)) / w);
    y1 = x1 * w;
    y2 = x2 * w;
    _gaussian_previous = true;
  }

  const m = mean || 0;
  return y1 * sd + m;
};
