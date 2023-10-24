const milisecondsInASecond = 1000;
const secondsInAnHour = 60 * 60;

export const getExpireAt = (): number =>
  Date.now() / milisecondsInASecond + 4 * secondsInAnHour;
