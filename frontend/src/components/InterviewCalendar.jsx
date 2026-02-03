import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";

export default function InterviewCalendar({ interviews }) {
  const events = interviews.map(i => ({
    title: `${i.first_name} - ${i.level_name}`,
    start: i.interview_date,
    color:
      i.status === "Passed" ? "green" :
      i.status === "Failed" ? "red" :
      "#0984e3"
  }));

  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin]}
      initialView="dayGridMonth"
      events={events}
      height={500}
    />
  );
}
