export function debounce(f: any, ms: number): (...attrs: any[]) => void {
  let isCooldown = false;

  return function () {
    if (isCooldown) {
      return;
    }

    //[!]does not save context
    // should be 'this' instead of 'null'
    f.apply(null, arguments);

    isCooldown = true;

    setTimeout(() => (isCooldown = false), ms);
  };
}

//[!]does not save context
// should be 'this' instead of 'null'
export function throttle(func: any, ms: number): (...attrs: any[]) => void {
  let isThrottled = false,
    savedArgs: any,
    savedThis: any;

  function wrapper() {
    savedArgs = arguments;
    savedThis = null;
    if (isThrottled) {
      // (2)
      return;
    }

    //func.apply(null, arguments); // (1)

    isThrottled = true;

    setTimeout(function () {
      isThrottled = false; // (3)
      if (savedArgs) {
        func.apply(savedThis, savedArgs);
        savedArgs = savedThis = null;
      }
    }, ms);
  }

  return wrapper;
}

