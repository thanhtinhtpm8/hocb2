const cache = new Map();

async function fetchJSON(path) {
  if (cache.has(path)) return cache.get(path);
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Không tải được dữ liệu: ${path}`);
  const json = await res.json();
  cache.set(path, json);
  return json;
}

export const Data = {
  getManifest() { return fetchJSON("data/manifest.json"); },

  async findWeek(courseId, monthId, weekId) {
    const manifest = await this.getManifest();
    const course = manifest.courses.find((c) => c.id === courseId);
    if (!course) return null;
    const month = course.months.find((m) => m.id === monthId);
    if (!month) return null;
    const week = month.weeks.find((w) => w.id === weekId);
    if (!week) return null;
    return { course, month, week };
  },

  async getTheory(weekPath) { return fetchJSON(`data/${weekPath}/theory.json`); },
  async getVocab(weekPath) { return fetchJSON(`data/${weekPath}/vocab.json`); },
  async getQuiz(weekPath) { return fetchJSON(`data/${weekPath}/quiz.json`); },

  async getAllReadyWeeks() {
    const manifest = await this.getManifest();
    const weeks = [];
    for (const course of manifest.courses) {
      for (const month of course.months) {
        for (const week of month.weeks) {
          if (week.status === "ready") {
            weeks.push({ courseId: course.id, monthId: month.id, ...week });
          }
        }
      }
    }
    return weeks;
  },
};
