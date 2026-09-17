/**
 * Smart College Timetable Scheduler - Engine
 * Handles randomized backtracking search to generate clash-free timetables.
 */

class TimetableScheduler {
  constructor(faculties, subjects, assignments) {
    this.faculties = faculties; // Array of { name, code }
    this.subjects = subjects; // Array of { name, code, year, weeklyHours, type }
    this.assignments = assignments; // Object mapping subjectCode -> facultyCode
    
    // Constants
    this.DAYS = ['A', 'B', 'C', 'D', 'E', 'F']; // 6 Day Orders
    this.PERIODS = 5; // 5 Periods per day (P1, P2, P3, Break, P4, P5)
    this.CLASSES = ['I B.Voc SD & SA', 'II B.Voc SD & SA', 'III B.Voc SD & SA'];
  }

  /**
   * Helper to partition lab hours into blocks of 3 (before break) or 2 (after break).
   */
  partitionLabHours(hours) {
    if (hours <= 0) return [];
    if (hours === 1) return [2]; // Fallback, round up to a 2-hour lab
    if (hours === 2) return [2];
    if (hours === 3) return [3];
    if (hours === 4) return [2, 2];
    if (hours === 5) return [3, 2];
    if (hours === 6) return [3, 3];
    if (hours === 7) return [3, 2, 2];
    if (hours === 8) return [3, 3, 2];
    
    // General partitioning: try to use as many 3s as possible, then 2s
    const units = [];
    let rem = hours;
    while (rem > 0) {
      if (rem >= 3 && rem !== 4) {
        units.push(3);
        rem -= 3;
      } else {
        units.push(2);
        rem -= 2;
      }
    }
    return units;
  }

  /**
   * Shuffles an array in place.
   */
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Main generation function.
   * Runs the backtracking search. Returns timetable object or throws error.
   */
  generate() {
    // 1. Prepare Scheduling Units
    const units = [];
    
    // Validate that all subjects have assignments
    for (const sub of this.subjects) {
      const facultyCode = this.assignments[sub.code];
      if (!facultyCode) {
        throw new Error(`Assignment missing: No faculty assigned to subject "${sub.name}" (${sub.code}).`);
      }
    }

    for (const sub of this.subjects) {
      const facultyCode = this.assignments[sub.code];
      const classId = sub.year; // e.g. "I B.Voc SD & SA"
      
      if (sub.type.toLowerCase() === 'lab') {
        const blocks = this.partitionLabHours(parseInt(sub.weeklyHours, 10));
        for (const blockSize of blocks) {
          units.push({
            subjectCode: sub.code,
            classId: classId,
            facultyCode: facultyCode,
            size: blockSize,
            type: 'lab'
          });
        }
      } else {
        const hours = parseInt(sub.weeklyHours, 10);
        for (let i = 0; i < hours; i++) {
          units.push({
            subjectCode: sub.code,
            classId: classId,
            facultyCode: facultyCode,
            size: 1,
            type: 'theory'
          });
        }
      }
    }

    // Sort units: Labs of size 3 first, then Labs of size 2, then Theory of size 1.
    // This heuristic places the most constrained items first.
    units.sort((a, b) => b.size - a.size);

    // Try generating with different shuffles. Max 100 attempts.
    for (let attempt = 1; attempt <= 100; attempt++) {
      // We shuffle units of the same size to introduce scheduling variety
      this.shuffleUnitsGrouped(units);

      const result = this.runSearch(units);
      if (result) {
        // Run validation check
        const validation = this.validateTimetable(result);
        if (validation.valid) {
          return result;
        } else {
          console.warn(`Attempt ${attempt} generated a timetable, but it failed validation:`, validation.errors);
        }
      }
    }

    throw new Error("Could not find a clash-free timetable solution. The constraints might be too tight or faculty workload is exceeded. Please check faculty assignments or reduce weekly hours.");
  }

  /**
   * Helper to shuffle units of identical size to maintain constraint sorting but randomize order.
   */
  shuffleUnitsGrouped(units) {
    let i = 0;
    while (i < units.length) {
      let j = i;
      while (j < units.length && units[j].size === units[i].size) {
        j++;
      }
      // Shuffle subarray from i to j-1
      const sub = units.slice(i, j);
      this.shuffle(sub);
      for (let k = 0; k < sub.length; k++) {
        units[i + k] = sub[k];
      }
      i = j;
    }
  }

  /**
   * Core Backtracking Search
   */
  runSearch(units) {
    // Initialise empty timetable grid: timetable[classId][dayIndex][periodIndex] = subjectCode
    const timetable = {};
    for (const cls of this.CLASSES) {
      timetable[cls] = Array(this.DAYS.length).fill(null).map(() => Array(this.PERIODS).fill(null));
    }

    // Faculty occupied slots tracker: facultyOccupied[facultyCode][dayIndex][periodIndex] = boolean
    const facultyOccupied = {};
    // Faculty daily workload tracker: facultyWorkload[facultyCode][dayIndex] = integer
    const facultyWorkload = {};
    
    for (const fac of this.faculties) {
      facultyOccupied[fac.code] = Array(this.DAYS.length).fill(null).map(() => Array(this.PERIODS).fill(false));
      facultyWorkload[fac.code] = Array(this.DAYS.length).fill(0);
    }

    const self = this;

    function backtrack(unitIndex) {
      if (unitIndex === units.length) {
        return true; // All units successfully placed!
      }

      const unit = units[unitIndex];
      const { classId, subjectCode, facultyCode, size, type } = unit;

      if (size === 3) {
        // Lab before break: occupies periods 0, 1, 2 (P1, P2, P3)
        // Candidates are the days [0..5]
        const days = self.shuffle([0, 1, 2, 3, 4, 5]);
        for (const d of days) {
          // Check if class is free in periods 0, 1, 2
          const classFree = timetable[classId][d][0] === null && 
                            timetable[classId][d][1] === null && 
                            timetable[classId][d][2] === null;
          if (!classFree) continue;

          // Check if faculty is free in periods 0, 1, 2
          const facFree = !facultyOccupied[facultyCode][d][0] && 
                          !facultyOccupied[facultyCode][d][1] && 
                          !facultyOccupied[facultyCode][d][2];
          if (!facFree) continue;

          // Check faculty workload (max 4 per day)
          if (facultyWorkload[facultyCode][d] + 3 > 4) continue;

          // Avoid scheduling the same lab on the same day twice (already checked by class occupancy, but good safeguard)
          if (self.isSubjectScheduledOnDay(timetable[classId], d, subjectCode)) continue;

          // Make assignment
          for (let p = 0; p < 3; p++) {
            timetable[classId][d][p] = subjectCode;
            facultyOccupied[facultyCode][d][p] = true;
          }
          facultyWorkload[facultyCode][d] += 3;

          // Recurse
          if (backtrack(unitIndex + 1)) return true;

          // Undo assignment (backtrack)
          for (let p = 0; p < 3; p++) {
            timetable[classId][d][p] = null;
            facultyOccupied[facultyCode][d][p] = false;
          }
          facultyWorkload[facultyCode][d] -= 3;
        }
      } 
      
      else if (size === 2) {
        // Lab after break: occupies periods 3, 4 (P4, P5)
        const days = self.shuffle([0, 1, 2, 3, 4, 5]);
        for (const d of days) {
          // Check if class is free in periods 3, 4
          const classFree = timetable[classId][d][3] === null && 
                            timetable[classId][d][4] === null;
          if (!classFree) continue;

          // Check if faculty is free in periods 3, 4
          const facFree = !facultyOccupied[facultyCode][d][3] && 
                          !facultyOccupied[facultyCode][d][4];
          if (!facFree) continue;

          // Check faculty workload
          if (facultyWorkload[facultyCode][d] + 2 > 4) continue;

          // Avoid same subject on same day
          if (self.isSubjectScheduledOnDay(timetable[classId], d, subjectCode)) continue;

          // Make assignment
          for (let p = 3; p < 5; p++) {
            timetable[classId][d][p] = subjectCode;
            facultyOccupied[facultyCode][d][p] = true;
          }
          facultyWorkload[facultyCode][d] += 2;

          // Recurse
          if (backtrack(unitIndex + 1)) return true;

          // Undo
          for (let p = 3; p < 5; p++) {
            timetable[classId][d][p] = null;
            facultyOccupied[facultyCode][d][p] = false;
          }
          facultyWorkload[facultyCode][d] -= 2;
        }
      } 
      
      else if (size === 1) {
        // Theory: occupies a single slot (d, p)
        // Generate list of all 30 slots and shuffle them
        const slots = [];
        for (let d = 0; d < 6; d++) {
          for (let p = 0; p < 5; p++) {
            slots.push({ d, p });
          }
        }
        self.shuffle(slots);

        for (const { d, p } of slots) {
          // Check if class is free
          if (timetable[classId][d][p] !== null) continue;

          // Check if faculty is free
          if (facultyOccupied[facultyCode][d][p]) continue;

          // Check faculty workload limit (max 4 per day)
          if (facultyWorkload[facultyCode][d] + 1 > 4) continue;

          // Subject repetition/balanced distribution rules:
          // How many hours of this theory subject are already scheduled on day d?
          const currentCountOnDay = self.getSubjectCountOnDay(timetable[classId], d, subjectCode);
          
          // Get the subject details to check weekly hours
          const subDetails = self.subjects.find(s => s.code === subjectCode);
          const maxAllowedPerDay = subDetails ? Math.ceil(subDetails.weeklyHours / 6) : 1;
          
          if (currentCountOnDay >= maxAllowedPerDay) continue;

          // If it's already scheduled once on this day (for H > 6), avoid placing it consecutively
          if (currentCountOnDay > 0) {
            // Check adjacent periods
            const isAdjacent = (p > 0 && timetable[classId][d][p - 1] === subjectCode) ||
                               (p < 4 && timetable[classId][d][p + 1] === subjectCode);
            if (isAdjacent) continue;
          }

          // Make assignment
          timetable[classId][d][p] = subjectCode;
          facultyOccupied[facultyCode][d][p] = true;
          facultyWorkload[facultyCode][d] += 1;

          // Recurse
          if (backtrack(unitIndex + 1)) return true;

          // Undo
          timetable[classId][d][p] = null;
          facultyOccupied[facultyCode][d][p] = false;
          facultyWorkload[facultyCode][d] -= 1;
        }
      }

      return false; // Backtrack: no valid slot found for this unit in current configuration
    }

    const success = backtrack(0);
    return success ? timetable : null;
  }

  /**
   * Helper to check if a subject is scheduled on a day.
   */
  isSubjectScheduledOnDay(classDayTimetable, dayIndex, subjectCode) {
    return classDayTimetable[dayIndex].includes(subjectCode);
  }

  /**
   * Helper to count occurrences of a subject on a day.
   */
  getSubjectCountOnDay(classDayTimetable, dayIndex, subjectCode) {
    return classDayTimetable[dayIndex].filter(s => s === subjectCode).length;
  }

  /**
   * Automated validator to verify all rules are met.
   */
  validateTimetable(timetable) {
    const errors = [];
    
    // Create mapping of subjectCode -> facultyCode and type
    const subMap = {};
    for (const sub of this.subjects) {
      subMap[sub.code] = {
        faculty: this.assignments[sub.code],
        type: sub.type,
        hours: parseInt(sub.weeklyHours, 10)
      };
    }

    // 1. Check Faculty Clashes & Daily Workloads
    // facultySlots[facultyCode][dayIndex][periodIndex] = array of { classId, subjectCode }
    const facultySlots = {};
    const facultyDailyHrs = {};

    for (const fac of this.faculties) {
      facultySlots[fac.code] = Array(this.DAYS.length).fill(null).map(() => Array(this.PERIODS).fill(null).map(() => []));
      facultyDailyHrs[fac.code] = Array(this.DAYS.length).fill(0);
    }

    // Populate faculty occupations
    for (const cls of this.CLASSES) {
      for (let d = 0; d < this.DAYS.length; d++) {
        for (let p = 0; p < this.PERIODS; p++) {
          const subCode = timetable[cls][d][p];
          if (subCode) {
            const details = subMap[subCode];
            if (details && details.faculty) {
              facultySlots[details.faculty][d][p].push({ classId: cls, subjectCode: subCode });
              facultyDailyHrs[details.faculty][d] += 1;
            }
          }
        }
      }
    }

    // Validate no faculty clash and daily workload
    for (const facCode in facultySlots) {
      for (let d = 0; d < this.DAYS.length; d++) {
        // Faculty Workload Check
        if (facultyDailyHrs[facCode][d] > 4) {
          errors.push(`Faculty "${facCode}" daily workload exceeds 4 hours on day "${this.DAYS[d]}" (Actual: ${facultyDailyHrs[facCode][d]} hours).`);
        }

        // Faculty Clash Check
        for (let p = 0; p < this.PERIODS; p++) {
          const slots = facultySlots[facCode][d][p];
          if (slots.length > 1) {
            const details = slots.map(s => `${s.classId} (${s.subjectCode})`).join(', ');
            errors.push(`Faculty Clash! Faculty "${facCode}" is scheduled in multiple classes at Period ${p + 1} on Day ${this.DAYS[d]}: ${details}.`);
          }
        }
      }
    }

    // 2. Validate Lab Continual Blocks
    for (const cls of this.CLASSES) {
      for (let d = 0; d < this.DAYS.length; d++) {
        // Check Lab before break: Period 1, 2, 3 (indices 0, 1, 2)
        // If any of these contains a Lab subject, all three must contain the SAME lab subject.
        const beforeBreakSubs = [timetable[cls][d][0], timetable[cls][d][1], timetable[cls][d][2]];
        const labInBeforeBreak = beforeBreakSubs.some(s => s && subMap[s] && subMap[s].type.toLowerCase() === 'lab');
        
        if (labInBeforeBreak) {
          const firstSub = beforeBreakSubs.find(s => s !== null);
          if (!firstSub || beforeBreakSubs[0] !== firstSub || beforeBreakSubs[1] !== firstSub || beforeBreakSubs[2] !== firstSub) {
            errors.push(`Invalid Lab Allocation: Lab before break must occupy all of Period 1, 2, and 3 on Day "${this.DAYS[d]}" for "${cls}" (Got: P1="${beforeBreakSubs[0]}", P2="${beforeBreakSubs[1]}", P3="${beforeBreakSubs[2]}").`);
          }
        }

        // Check Lab after break: Period 4, 5 (indices 3, 4)
        const afterBreakSubs = [timetable[cls][d][3], timetable[cls][d][4]];
        const labInAfterBreak = afterBreakSubs.some(s => s && subMap[s] && subMap[s].type.toLowerCase() === 'lab');

        if (labInAfterBreak) {
          const firstSub = afterBreakSubs.find(s => s !== null);
          if (!firstSub || afterBreakSubs[0] !== firstSub || afterBreakSubs[1] !== firstSub) {
            errors.push(`Invalid Lab Allocation: Lab after break must occupy both Period 4 and 5 on Day "${this.DAYS[d]}" for "${cls}" (Got: P4="${afterBreakSubs[0]}", P5="${afterBreakSubs[1]}").`);
          }
        }
      }
    }

    // 3. Verify Scheduled Hours Match Target
    const scheduledHoursCounter = {};
    for (const cls of this.CLASSES) {
      for (let d = 0; d < this.DAYS.length; d++) {
        for (let p = 0; p < this.PERIODS; p++) {
          const subCode = timetable[cls][d][p];
          if (subCode) {
            scheduledHoursCounter[subCode] = (scheduledHoursCounter[subCode] || 0) + 1;
          }
        }
      }
    }

    for (const sub of this.subjects) {
      const target = parseInt(sub.weeklyHours, 10);
      const actual = scheduledHoursCounter[sub.code] || 0;
      if (actual !== target) {
        errors.push(`Weekly Hours Mismatch: Subject "${sub.name}" (${sub.code}) has ${actual} scheduled hours, but target is ${target}.`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
}

// Export for browser
if (typeof window !== 'undefined') {
  window.TimetableScheduler = TimetableScheduler;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TimetableScheduler;
}
