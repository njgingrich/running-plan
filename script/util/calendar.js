import { ICalCalendar, ICalCalendarMethod } from "ical-generator";

export function generateCalendarExport(plan) {
  const raceDateVal = document.getElementById("raceDate").value;
  if (!plan || !raceDateVal) return;

  const raceDate = Temporal.PlainDate.from(raceDateVal);
  const startDate = raceDate.subtract({ days: 6 }).subtract({ weeks: plan.weeks.length - 1 });

  const cal = new ICalCalendar();
  cal.name("Training Plan");
  cal.description(`${plan.name} - Race date: ${raceDate}`);
  cal.prodId("//njgingrich.github.io//Training Plan//EN");
  cal.method(ICalCalendarMethod.PUBLISH);

  plan.weeks.forEach((week, weekIndex) => {
    const weekStartDate = startDate.add({ weeks: weekIndex });
    const weekVolume = week.reduce((acc, workout) => acc + workout.distance, 0);

    const startString = weekStartDate.toZonedDateTime("UTC").toString().replace("+00:00[UTC]", "");
    const endString = weekStartDate
      .add({ weeks: 1 })
      .toZonedDateTime("UTC")
      .toString()
      .replace("+00:00[UTC]", "");

    const weekEvent = cal.createEvent({
      start: new Date(startString),
      end: new Date(endString),
      description: `Week ${weekIndex + 1} - ${weekVolume} miles`,
      summary: `${plan.weeks.length - 1 - weekIndex} weeks to goal (${weekVolume} miles)`,
    });

    week.forEach((workout, dayIndex) => {
      const date = weekStartDate.add({ days: dayIndex });
      let description = `${workout.distance}${workout.distanceUnit}`;

      let summary = `${plan.types[workout.type]}`;
      if (workout.distance && workout.distance > 0) {
        summary = `${plan.types[workout.type]} - ${workout.distance}${workout.distanceUnit}`;
      }
      if (workout.notes) {
        description += ` - ${workout.notes}`;
      }
      const event = cal.createEvent({
        allDay: true,
        start: new Date(date.toString()),
        description: description,
        summary,
      });
    });
  });

  return cal;
}
