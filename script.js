const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";
const STORAGE_KEY = "facultyCSE326IntermediateV1";
const VALID_SEMESTERS = [
    "Semester 1", "Semester 2", "Semester 3", "Semester 4",
    "Semester 5", "Semester 6", "Semester 7", "Semester 8"
];
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const times = ["09:20", "10:10", "11:00", "11:50", "12:40", "13:30", "14:20", "15:10", "16:00", "16:50"];

let data = loadData();
let faculty = data.faculty;
let courses = data.courses;
let allocations = data.allocations;
let editingCourseId = null;
let editingFacultyId = null;

function isPositiveWholeNumber(value) {
    return typeof value === "number" && !isNaN(value) && value >= 1 && value % 1 === 0;
}

function loadData() {
    let clean = { faculty: [], courses: [], allocations: [], nextId: 1 };
    let savedText = localStorage.getItem(STORAGE_KEY);
    if (savedText === null) {
        return clean;
    }
    let parsed = null;
    try {
        parsed = JSON.parse(savedText);
    } catch (error) {
        return clean;
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        return clean;
    }
    let maxId = 0;
    let rawCourses = Array.isArray(parsed.courses) ? parsed.courses : [];
    for (let i = 0; i < rawCourses.length; i++) {
        let item = rawCourses[i];
        if (
            item &&
            typeof item === "object" &&
            isPositiveWholeNumber(item.id) &&
            typeof item.code === "string" &&
            item.code.trim() !== "" &&
            typeof item.name === "string" &&
            item.name.trim() !== "" &&
            VALID_SEMESTERS.includes(item.semester) &&
            isPositiveWholeNumber(item.units) &&
            item.units <= 54
        ) {
            if (findRecord(clean.courses, item.id) === null) {
                clean.courses.push({
                    id: item.id,
                    code: item.code.trim().toUpperCase(),
                    name: item.name.trim(),
                    semester: item.semester,
                    units: item.units
                });
                if (item.id > maxId) {
                    maxId = item.id;
                }
            }
        }
    }

    let rawFaculty = Array.isArray(parsed.faculty) ? parsed.faculty : [];
    for (let i = 0; i < rawFaculty.length; i++) {
        let person = rawFaculty[i];
        if (
            person &&
            typeof person === "object" &&
            isPositiveWholeNumber(person.id) &&
            typeof person.name === "string" &&
            person.name.trim() !== "" &&
            isPositiveWholeNumber(person.limit) &&
            person.limit <= 54
        ) {
            if (findRecord(clean.faculty, person.id) === null) {
                let validCourseIds = [];
                if (Array.isArray(person.courseIds)) {
                    for (let j = 0; j < person.courseIds.length; j++) {
                        let cid = Number(person.courseIds[j]);
                        if (findRecord(clean.courses, cid) !== null && !validCourseIds.includes(cid)) {
                            validCourseIds.push(cid);
                        }
                    }
                }
                clean.faculty.push({
                    id: person.id,
                    name: person.name.trim(),
                    limit: person.limit,
                    courseIds: validCourseIds
                });
                if (person.id > maxId) {
                    maxId = person.id;
                }
            }
        }
    }

    let rawAllocations = Array.isArray(parsed.allocations) ? parsed.allocations : [];
    for (let i = 0; i < rawAllocations.length; i++) {
        let alloc = rawAllocations[i];
        if (alloc && typeof alloc === "object" && isPositiveWholeNumber(alloc.id)) {
            let person = findRecord(clean.faculty, alloc.facultyId);
            let course = findRecord(clean.courses, alloc.courseId);
            let slotIndex = times.indexOf(alloc.start);
            if (
                person !== null &&
                course !== null &&
                alloc.semester === course.semester &&
                days.includes(alloc.day) &&
                slotIndex >= 0 &&
                slotIndex < times.length - 1 &&
                findRecord(clean.allocations, alloc.id) === null
            ) {
                clean.allocations.push({
                    id: alloc.id,
                    facultyId: person.id,
                    courseId: course.id,
                    semester: course.semester,
                    day: alloc.day,
                    start: times[slotIndex],
                    end: times[slotIndex + 1]
                });
                if (alloc.id > maxId) {
                    maxId = alloc.id;
                }
            }
        }
    }

    let savedNextId = isPositiveWholeNumber(parsed.nextId) ? parsed.nextId : 1;
    clean.nextId = Math.max(savedNextId, maxId + 1);
    return clean;
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function showMessage(elementId, text, type) {
    let element = document.getElementById(elementId);
    if (text === "") {
        element.textContent = "";
        element.hidden = true;
        element.className = "message full-span";
        return;
    }
    element.textContent = text;
    element.hidden = false;
    if (elementId === "loginMessage") {
        element.className = "message " + type;
    } else {
        element.className = "message full-span " + type;
    }
}

function login(event) {
    event.preventDefault();
    let username = document.getElementById("username").value.trim();
    let password = document.getElementById("password").value;
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        document.getElementById("login").hidden = true;
        document.getElementById("app").hidden = false;
        showMessage("loginMessage", "", "warning");
        document.getElementById("password").value = "";
        showSection("home");
    } else {
        showMessage("loginMessage", "Incorrect username or password.", "warning");
    }
}

function logout() {
    document.getElementById("app").hidden = true;
    document.getElementById("login").hidden = false;
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
    showMessage("loginMessage", "", "warning");
}

function showSection(name) {
    let pages = document.getElementsByClassName("page");
    for (let i = 0; i < pages.length; i++) {
        pages[i].hidden = true;
    }
    document.getElementById(name).hidden = false;
    let buttons = document.getElementsByClassName("nav-button");
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].className = "nav-button";
        if (buttons[i].value === name) {
            buttons[i].className = "nav-button active";
        }
    }
    updatePage();
}

function currentSemester() {
    return document.getElementById("semester").value;
}

function findRecord(list, id) {
    for (let i = 0; i < list.length; i++) {
        if (list[i].id === id) {
            return list[i];
        }
    }
    return null;
}

function assignedUnits(facultyId) {
    let total = 0;
    for (let i = 0; i < allocations.length; i++) {
        if (allocations[i].facultyId === facultyId) {
            total++;
        }
    }
    return total;
}

function facultyAllocationsForCourse(facultyId, courseId) {
    let total = 0;
    for (let i = 0; i < allocations.length; i++) {
        if (allocations[i].facultyId === facultyId && allocations[i].courseId === courseId) {
            total++;
        }
    }
    return total;
}

function semesterRequirement(semester) {
    let total = 0;
    for (let i = 0; i < courses.length; i++) {
        if (courses[i].semester === semester) {
            total += courses[i].units;
        }
    }
    return total;
}

function scheduledClasses(courseId) {
    let total = 0;
    for (let i = 0; i < allocations.length; i++) {
        if (allocations[i].courseId === courseId) {
            total++;
        }
    }
    return total;
}

function facultyUnusedCapacity(person) {
    return Math.max(0, person.limit - assignedUnits(person.id));
}

function facultyEligibleDemand(person) {
    let demand = 0;
    for (let i = 0; i < person.courseIds.length; i++) {
        let course = findRecord(courses, person.courseIds[i]);
        if (course !== null) {
            demand += Math.max(0, course.units - scheduledClasses(course.id));
        }
    }
    return demand;
}

function facultyAvailable(person) {
    return Math.min(facultyUnusedCapacity(person), facultyEligibleDemand(person));
}

function mutuallyAvailableSlots(semester, facultyId) {
    let count = 0;
    for (let i = 0; i < times.length - 1; i++) {
        for (let d = 0; d < days.length; d++) {
            let blocked = false;
            for (let k = 0; k < allocations.length; k++) {
                let item = allocations[k];
                if (item.day === days[d] && item.start === times[i]) {
                    if (item.semester === semester || item.facultyId === facultyId) {
                        blocked = true;
                        break;
                    }
                }
            }
            if (!blocked) {
                count++;
            }
        }
    }
    return count;
}

function assignableClassesForPair(course, person) {
    let remainingCourse = Math.max(0, course.units - scheduledClasses(course.id));
    let remainingFaculty = facultyUnusedCapacity(person);
    let freeSlots = mutuallyAvailableSlots(course.semester, person.id);
    return Math.min(remainingCourse, remainingFaculty, freeSlots);
}

function saveCourse(event) {
    event.preventDefault();
    let code = document.getElementById("courseCode").value.trim().toUpperCase();
    let name = document.getElementById("courseName").value.trim();
    let targetSemester = document.getElementById("courseSemester").value;
    let units = Number(document.getElementById("units").value);

    if (code === "" || name === "" || !isPositiveWholeNumber(units) || units > 54) {
        showMessage("courseMessage", "Enter a valid course code, course name, and whole number of weekly classes (1 to 54).", "warning");
        return;
    }
    if (!VALID_SEMESTERS.includes(targetSemester)) {
        showMessage("courseMessage", "Select a valid semester.", "warning");
        return;
    }
    for (let i = 0; i < courses.length; i++) {
        if (courses[i].id !== editingCourseId && courses[i].code === code && courses[i].semester === targetSemester) {
            showMessage("courseMessage", "Course code " + code + " already exists in " + targetSemester + ".", "warning");
            return;
        }
    }

    if (editingCourseId !== null) {
        let existing = findRecord(courses, editingCourseId);
        if (existing === null) {
            cancelCourseEdit();
            return;
        }
        let scheduled = scheduledClasses(existing.id);
        if (scheduled > 0 && targetSemester !== existing.semester) {
            showMessage("courseMessage", "Cannot change semester while this course has " + scheduled + " scheduled allocation(s).", "warning");
            return;
        }
        if (units < scheduled) {
            showMessage("courseMessage", "Required classes cannot be reduced below existing allocations (" + scheduled + ").", "warning");
            return;
        }
        let currentSemReq = semesterRequirement(targetSemester);
        let adjustedReq = targetSemester === existing.semester ? currentSemReq - existing.units : currentSemReq;
        if (adjustedReq + units > 54) {
            showMessage("courseMessage", "Cannot save: " + targetSemester + " only has " + (54 - adjustedReq) + " available weekly slot(s) remaining.", "warning");
            return;
        }
        existing.code = code;
        existing.name = name;
        existing.semester = targetSemester;
        existing.units = units;
        cancelCourseEdit();
        updatePage();
        showMessage("courseMessage", "Course " + code + " updated.", "success");
        return;
    }

    let required = semesterRequirement(targetSemester);
    if (required + units > 54) {
        showMessage("courseMessage", "Only " + (54 - required) + " weekly slot(s) remain for course requirements in " + targetSemester + ".", "warning");
        return;
    }
    courses.push({ id: data.nextId, code: code, name: name, units: units, semester: targetSemester });
    data.nextId = data.nextId + 1;
    document.getElementById("courseForm").reset();
    document.getElementById("courseSemester").value = currentSemester();
    updatePage();
    showMessage("courseMessage", "Course " + code + " added to " + targetSemester + ".", "success");
}

function startCourseEdit(id) {
    let course = findRecord(courses, id);
    if (course === null) {
        return;
    }
    editingCourseId = course.id;
    document.getElementById("courseFormTitle").textContent = "Edit Course (" + course.code + ")";
    document.getElementById("courseCode").value = course.code;
    document.getElementById("courseName").value = course.name;
    document.getElementById("courseSemester").value = course.semester;
    document.getElementById("courseSemester").disabled = scheduledClasses(course.id) > 0;
    document.getElementById("units").value = course.units;
    document.getElementById("saveCourseButton").textContent = "Save course changes";
    document.getElementById("cancelCourseEditButton").hidden = false;
    showMessage("courseMessage", scheduledClasses(course.id) > 0 ? "Semester is locked because allocations already exist for this course." : "", "success");
}

function cancelCourseEdit() {
    editingCourseId = null;
    document.getElementById("courseForm").reset();
    document.getElementById("courseFormTitle").textContent = "Register Course";
    document.getElementById("courseSemester").disabled = false;
    document.getElementById("courseSemester").value = currentSemester();
    document.getElementById("saveCourseButton").textContent = "Add course";
    document.getElementById("cancelCourseEditButton").hidden = true;
    showMessage("courseMessage", "", "success");
}

function saveFaculty(event) {
    event.preventDefault();
    if (courses.length === 0) {
        showMessage("facultyMessage", "Register at least one course before adding faculty.", "warning");
        return;
    }
    let name = document.getElementById("facultyName").value.trim();
    let limit = Number(document.getElementById("limit").value);
    if (name === "" || !isPositiveWholeNumber(limit) || limit > 54) {
        showMessage("facultyMessage", "Enter a valid faculty name and whole number weekly capacity (1 to 54).", "warning");
        return;
    }
    let courseIds = [];
    let options = document.getElementById("facultyCourses").options;
    for (let i = 0; i < options.length; i++) {
        if (options[i].selected) {
            courseIds.push(Number(options[i].value));
        }
    }
    if (courseIds.length === 0) {
        showMessage("facultyMessage", "Select at least one eligible course.", "warning");
        return;
    }
    for (let i = 0; i < faculty.length; i++) {
        if (faculty[i].id !== editingFacultyId && faculty[i].name.toLowerCase() === name.toLowerCase()) {
            showMessage("facultyMessage", "A faculty profile with this name already exists.", "warning");
            return;
        }
    }

    if (editingFacultyId !== null) {
        let existing = findRecord(faculty, editingFacultyId);
        if (existing === null) {
            cancelFacultyEdit();
            return;
        }
        let assigned = assignedUnits(existing.id);
        if (limit < assigned) {
            showMessage("facultyMessage", "Maximum weekly capacity cannot be reduced below already assigned classes (" + assigned + ").", "warning");
            return;
        }
        for (let i = 0; i < existing.courseIds.length; i++) {
            let oldCourseId = existing.courseIds[i];
            if (!courseIds.includes(oldCourseId) && facultyAllocationsForCourse(existing.id, oldCourseId) > 0) {
                let lockedCourse = findRecord(courses, oldCourseId);
                let codeLabel = lockedCourse !== null ? lockedCourse.code : "ID " + oldCourseId;
                showMessage("facultyMessage", "Cannot remove eligibility for " + codeLabel + " because this faculty member currently has assigned classes for it.", "warning");
                return;
            }
        }
        existing.name = name;
        existing.limit = limit;
        existing.courseIds = courseIds;
        cancelFacultyEdit();
        updatePage();
        showMessage("facultyMessage", "Faculty profile for " + name + " updated.", "success");
        return;
    }

    faculty.push({ id: data.nextId, name: name, limit: limit, courseIds: courseIds });
    data.nextId = data.nextId + 1;
    document.getElementById("facultyForm").reset();
    updatePage();
    showMessage("facultyMessage", "Faculty profile for " + name + " added.", "success");
}

function startFacultyEdit(id) {
    let person = findRecord(faculty, id);
    if (person === null) {
        return;
    }
    editingFacultyId = person.id;
    document.getElementById("facultyFormTitle").textContent = "Edit Faculty (" + person.name + ")";
    document.getElementById("facultyName").value = person.name;
    document.getElementById("limit").value = person.limit;
    let options = document.getElementById("facultyCourses").options;
    for (let i = 0; i < options.length; i++) {
        options[i].selected = person.courseIds.includes(Number(options[i].value));
    }
    document.getElementById("saveFacultyButton").textContent = "Save faculty changes";
    document.getElementById("cancelFacultyEditButton").hidden = false;
    showMessage("facultyMessage", "", "success");
}

function cancelFacultyEdit() {
    editingFacultyId = null;
    document.getElementById("facultyForm").reset();
    document.getElementById("facultyFormTitle").textContent = "Register Faculty";
    document.getElementById("saveFacultyButton").textContent = "Add faculty";
    document.getElementById("cancelFacultyEditButton").hidden = true;
    showMessage("facultyMessage", "", "success");
}

function validateAllocation(semester, courseId, facultyId, day, slotIndex) {
    let course = findRecord(courses, courseId);
    if (course === null) {
        return { valid: false, message: "Select a valid registered course first." };
    }
    let person = findRecord(faculty, facultyId);
    if (person === null) {
        return { valid: false, message: "Select a valid eligible faculty member." };
    }
    if (course.semester !== semester) {
        return { valid: false, message: "Selected course does not belong to " + semester + "." };
    }
    if (!person.courseIds.includes(course.id)) {
        return { valid: false, message: "This faculty member is not eligible to teach " + course.code + "." };
    }
    if (scheduledClasses(course.id) >= course.units) {
        return { valid: false, message: "All required weekly classes for " + course.code + " are already scheduled." };
    }
    if (assignedUnits(person.id) >= person.limit) {
        return { valid: false, message: person.name + " has reached maximum weekly capacity (" + person.limit + ")." };
    }
    if (!days.includes(day) || !isPositiveWholeNumber(slotIndex) || slotIndex < 1 || slotIndex > 9) {
        return { valid: false, message: "Select a valid timetable day and class slot." };
    }
    let start = times[slotIndex - 1];
    for (let i = 0; i < allocations.length; i++) {
        let item = allocations[i];
        if (item.day === day && item.start === start) {
            if (item.facultyId === person.id) {
                return { valid: false, message: "Timetable conflict: " + person.name + " already has a class in this slot." };
            }
            if (item.semester === semester) {
                return { valid: false, message: "Timetable conflict: " + semester + " already has a class in this slot." };
            }
        }
    }
    return { valid: true, message: "" };
}

function getSlotState(semester, course, person, ready, day, slotIndex) {
    let start = times[slotIndex - 1];
    for (let i = 0; i < allocations.length; i++) {
        let item = allocations[i];
        if (item.day === day && item.start === start) {
            if (item.semester === semester) {
                let occCourse = findRecord(courses, item.courseId);
                let occPerson = findRecord(faculty, item.facultyId);
                let label = (occCourse ? occCourse.code : "Course") + " · " + (occPerson ? occPerson.name : "Faculty");
                return { state: "occupied", label: label, style: "occupied-slot", selectable: false };
            }
            if (person !== null && item.facultyId === person.id) {
                return { state: "busy", label: "Faculty busy", style: "busy-slot", selectable: false };
            }
        }
    }
    if (!ready) {
        return { state: "unavailable", label: "Unavailable", style: "free-slot", selectable: false };
    }
    return { state: "free", label: "Available", style: "free-slot", selectable: true };
}

function addAllocation(event) {
    event.preventDefault();
    let semester = currentSemester();
    let courseId = Number(document.getElementById("selectCourse").value);
    let facultyId = Number(document.getElementById("selectFaculty").value);
    let day = document.getElementById("day").value;
    let slotIndex = Number(document.getElementById("slot").value);

    let check = validateAllocation(semester, courseId, facultyId, day, slotIndex);
    if (!check.valid) {
        showMessage("allocationMessage", check.message, "warning");
        return;
    }

    let start = times[slotIndex - 1];
    let end = times[slotIndex];
    let course = findRecord(courses, courseId);
    allocations.push({
        id: data.nextId,
        facultyId: facultyId,
        courseId: courseId,
        semester: semester,
        day: day,
        start: start,
        end: end
    });
    data.nextId = data.nextId + 1;
    document.getElementById("day").value = "";
    document.getElementById("slot").value = "";
    updatePage();
    let completedNote = scheduledClasses(course.id) >= course.units ? " " + course.code + " is now complete." : "";
    showMessage("allocationMessage", "Class assigned successfully." + completedNote, "success");
}

function addRow(table, values) {
    let row = document.createElement("tr");
    table.appendChild(row);
    for (let i = 0; i < values.length; i++) {
        let cell = document.createElement("td");
        cell.textContent = values[i];
        row.appendChild(cell);
    }
    return row;
}

function addEmptyRow(table, colCount, text) {
    let row = document.createElement("tr");
    let cell = document.createElement("td");
    cell.colSpan = colCount;
    cell.className = "empty-cell";
    cell.textContent = text;
    row.appendChild(cell);
    table.appendChild(row);
}

function addActionButtons(row, type, id) {
    let cell = document.createElement("td");
    let group = document.createElement("div");
    group.className = "action-group";

    if (type === "courses" || type === "faculty") {
        let editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.textContent = "Edit";
        editBtn.className = "edit-btn";
        editBtn.value = id;
        editBtn.setAttribute("data-type", type);
        editBtn.addEventListener("click", handleEditClick);
        group.appendChild(editBtn);
    }

    let delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.textContent = "Delete";
    delBtn.className = "delete-btn";
    delBtn.value = id;
    delBtn.setAttribute("data-type", type);
    delBtn.addEventListener("click", deleteRecord);
    group.appendChild(delBtn);

    cell.appendChild(group);
    row.appendChild(cell);
}

function handleEditClick(event) {
    let type = event.target.getAttribute("data-type");
    let id = Number(event.target.value);
    if (type === "courses") {
        startCourseEdit(id);
    } else if (type === "faculty") {
        startFacultyEdit(id);
    }
}

function countRelatedAllocations(type, id) {
    let total = 0;
    for (let i = 0; i < allocations.length; i++) {
        if ((type === "faculty" && allocations[i].facultyId === id) ||
            (type === "courses" && allocations[i].courseId === id)) {
            total++;
        }
    }
    return total;
}

function deleteRecord(event) {
    let type = event.target.getAttribute("data-type");
    let id = Number(event.target.value);
    let confirmText = "Delete this record?";

    if (type === "courses") {
        let course = findRecord(courses, id);
        let affected = countRelatedAllocations("courses", id);
        let label = course !== null ? course.code : "this course";
        confirmText = "Delete course " + label + "? This will also remove " + affected + " scheduled allocation(s) and update faculty eligibility.";
    } else if (type === "faculty") {
        let person = findRecord(faculty, id);
        let affected = countRelatedAllocations("faculty", id);
        let label = person !== null ? person.name : "this faculty member";
        confirmText = "Delete faculty profile for " + label + "? This will also remove " + affected + " scheduled allocation(s) and return those classes to course demand.";
    } else if (type === "allocations") {
        confirmText = "Delete this scheduled class allocation? This will release the timetable slot and restore 1 unit of faculty capacity.";
    }

    if (!confirm(confirmText)) {
        return;
    }

    let list = data[type];
    for (let i = 0; i < list.length; i++) {
        if (list[i].id === id) {
            list.splice(i, 1);
            break;
        }
    }
    for (let i = allocations.length - 1; i >= 0; i--) {
        if ((type === "faculty" && allocations[i].facultyId === id) ||
            (type === "courses" && allocations[i].courseId === id)) {
            allocations.splice(i, 1);
        }
    }
    if (type === "courses") {
        for (let i = 0; i < faculty.length; i++) {
            let ids = faculty[i].courseIds;
            for (let j = ids.length - 1; j >= 0; j--) {
                if (ids[j] === id) {
                    ids.splice(j, 1);
                }
            }
        }
        if (editingCourseId === id) {
            cancelCourseEdit();
        }
    }
    if (type === "faculty" && editingFacultyId === id) {
        cancelFacultyEdit();
    }
    updatePage();
}

function updateFacultyChoices() {
    let select = document.getElementById("selectFaculty");
    select.innerHTML = '<option value="">Select faculty</option>';
    let courseId = Number(document.getElementById("selectCourse").value);
    let course = findRecord(courses, courseId);
    select.disabled = true;

    if (course !== null) {
        let eligibleCount = 0;
        let assignableCount = 0;
        for (let i = 0; i < faculty.length; i++) {
            if (faculty[i].courseIds.includes(courseId)) {
                eligibleCount++;
                let possible = assignableClassesForPair(course, faculty[i]);
                if (possible > 0) {
                    assignableCount++;
                }
                let option = document.createElement("option");
                option.value = faculty[i].id;
                option.textContent = faculty[i].name + " (" + possible + " assignable)";
                option.disabled = possible === 0;
                select.appendChild(option);
            }
        }
        if (eligibleCount === 0) {
            select.innerHTML = '<option value="">No eligible faculty</option>';
        } else if (assignableCount === 0) {
            select.disabled = false;
        } else {
            select.disabled = false;
        }
    }
    showMessage("allocationMessage", "", "success");
    updatePreview();
}

function updatePreview() {
    let semester = currentSemester();
    let course = findRecord(courses, Number(document.getElementById("selectCourse").value));
    let person = findRecord(faculty, Number(document.getElementById("selectFaculty").value));
    let courseSelect = document.getElementById("selectCourse");
    let text = "";

    if (courseSelect.options.length <= 1) {
        text = "No courses registered in " + semester + ". Add courses in the Courses section first.";
    } else if (course === null) {
        text = "Select a course first to view eligible faculty and available timetable slots.";
    } else {
        let scheduled = scheduledClasses(course.id);
        let remainingDemand = Math.max(0, course.units - scheduled);
        text = course.code + ": " + scheduled + " of " + course.units + " weekly classes scheduled (" + remainingDemand + " remaining).";
        if (remainingDemand === 0) {
            text += " Course complete. No more classes required.";
        } else {
            let eligibleCount = 0;
            let availableCount = 0;
            for (let i = 0; i < faculty.length; i++) {
                if (faculty[i].courseIds.includes(course.id)) {
                    eligibleCount++;
                    if (assignableClassesForPair(course, faculty[i]) > 0) {
                        availableCount++;
                    }
                }
            }
            if (eligibleCount === 0) {
                text += " No eligible faculty found. Configure course eligibility in Faculty Management.";
            } else if (availableCount === 0) {
                text += " Eligible faculty exist, but none can accept further classes (at capacity limit or no mutually available slots).";
            }
        }
    }

    if (course !== null && person !== null) {
        let assignable = assignableClassesForPair(course, person);
        let unused = facultyUnusedCapacity(person);
        text += " Selected faculty: " + person.name + " (assigned " + assignedUnits(person.id) + "/" + person.limit + ", unused capacity " + unused + ", assignable for this course: " + assignable + ").";
    }

    document.getElementById("allocationPreview").textContent = text;
    let ready = course !== null && person !== null && scheduledClasses(course.id) < course.units && facultyUnusedCapacity(person) > 0;
    let table = document.getElementById("slotGrid");
    let selectedDay = document.getElementById("day").value;
    let selectedSlot = Number(document.getElementById("slot").value);
    let validSelection = false;
    let freeCount = 0;
    table.innerHTML = "";

    for (let i = 0; i < times.length - 1; i++) {
        let row = addRow(table, [times[i] + " – " + times[i + 1]]);
        for (let d = 0; d < days.length; d++) {
            let cell = document.createElement("td");
            let button = document.createElement("button");
            let slotInfo = getSlotState(semester, course, person, ready, days[d], i + 1);

            button.type = "button";
            button.textContent = slotInfo.label;
            button.className = slotInfo.style;
            button.disabled = !slotInfo.selectable;
            if (slotInfo.selectable) {
                freeCount++;
            }
            button.value = i + 1;
            button.setAttribute("data-day", days[d]);
            button.setAttribute("aria-label", days[d] + " " + times[i] + " – " + times[i + 1] + ": " + slotInfo.label);

            if (slotInfo.selectable && selectedDay === days[d] && selectedSlot === i + 1) {
                button.className = "selected-slot";
                button.textContent = "Selected";
                validSelection = true;
            }
            button.addEventListener("click", chooseSlot);
            cell.appendChild(button);
            row.appendChild(cell);
        }
    }

    if (ready && freeCount === 0) {
        document.getElementById("allocationPreview").textContent += " No mutually available timetable slots remain.";
    }
    if (!validSelection) {
        document.getElementById("day").value = "";
        document.getElementById("slot").value = "";
    }
    document.getElementById("selectedSlot").textContent = validSelection
        ? "Selected slot: " + selectedDay + ", " + times[selectedSlot - 1] + " – " + times[selectedSlot]
        : "No slot selected. Complete steps 1 and 2, then click an available cell.";
    document.getElementById("assignButton").disabled = !validSelection;
}

function chooseSlot(event) {
    document.getElementById("day").value = event.target.getAttribute("data-day");
    document.getElementById("slot").value = event.target.value;
    showMessage("allocationMessage", "", "success");
    updatePreview();
}

function changeSelection() {
    document.getElementById("day").value = "";
    document.getElementById("slot").value = "";
    showMessage("allocationMessage", "", "success");
    updatePreview();
}

function changeCourse() {
    document.getElementById("day").value = "";
    document.getElementById("slot").value = "";
    updateFacultyChoices();
}

function changeSemester() {
    document.getElementById("selectCourse").value = "";
    document.getElementById("selectFaculty").value = "";
    document.getElementById("day").value = "";
    document.getElementById("slot").value = "";
    if (editingCourseId === null) {
        document.getElementById("courseSemester").value = currentSemester();
    }
    updatePage();
}

function updatePage() {
    let semester = currentSemester();
    let facultyTable = document.getElementById("facultyTable");
    let courseTable = document.getElementById("courseTable");
    let allocationTable = document.getElementById("allocationTable");
    let reportTable = document.getElementById("reportTable");
    facultyTable.innerHTML = "";
    courseTable.innerHTML = "";
    allocationTable.innerHTML = "";
    reportTable.innerHTML = "";

    let courseSelect = document.getElementById("selectCourse");
    let previousCourse = courseSelect.value;
    let previousFaculty = document.getElementById("selectFaculty").value;
    let profileSelect = document.getElementById("facultyCourses");
    courseSelect.innerHTML = '<option value="">Select course</option>';
    profileSelect.innerHTML = "";

    let noCoursesExist = courses.length === 0;
    document.getElementById("saveFacultyButton").disabled = noCoursesExist;
    if (noCoursesExist && editingFacultyId === null) {
        showMessage("facultyMessage", "Register at least one course in the Courses section before adding faculty.", "warning");
    } else if (editingFacultyId === null && document.getElementById("facultyMessage").textContent === "Register at least one course in the Courses section before adding faculty.") {
        showMessage("facultyMessage", "", "success");
    }

    let totalAssignedAll = 0;
    let totalCapacityAll = 0;
    let fullCount = 0;

    for (let i = 0; i < faculty.length; i++) {
        let person = faculty[i];
        let assigned = assignedUnits(person.id);
        let unused = person.limit - assigned;
        let demand = facultyEligibleDemand(person);
        let assignable = facultyAvailable(person);

        let status = "Within limit";
        if (person.courseIds.length === 0) {
            status = "Unassigned (no eligible courses)";
        } else if (unused < 0) {
            status = "Over limit";
            fullCount++;
        } else if (unused === 0) {
            status = "At limit";
            fullCount++;
        }

        totalAssignedAll += assigned;
        totalCapacityAll += person.limit;

        let courseLabels = [];
        for (let j = 0; j < person.courseIds.length; j++) {
            let c = findRecord(courses, person.courseIds[j]);
            if (c !== null) {
                courseLabels.push(c.code);
            }
        }
        let row = addRow(facultyTable, [
            person.name,
            courseLabels.join(", ") || "Unassigned",
            person.limit,
            assigned,
            Math.max(0, unused),
            demand,
            assignable,
            status
        ]);
        addActionButtons(row, "faculty", person.id);

        let semesterUnits = 0;
        for (let j = 0; j < allocations.length; j++) {
            if (allocations[j].facultyId === person.id && allocations[j].semester === semester) {
                semesterUnits++;
            }
        }
        let reportRow = addRow(reportTable, [
            person.name,
            semesterUnits,
            assigned,
            person.limit,
            Math.max(0, unused),
            demand,
            status
        ]);
        if (unused <= 0) {
            reportRow.className = "row-warning";
        }
    }

    let semesterCourseCount = 0;
    for (let i = 0; i < courses.length; i++) {
        let course = courses[i];
        let scheduled = scheduledClasses(course.id);
        let remaining = Math.max(0, course.units - scheduled);
        if (course.semester === semester) {
            semesterCourseCount++;
            let courseStatus = remaining === 0 ? "Completed" : "Pending";
            let row = addRow(courseTable, [
                course.code,
                course.name,
                course.semester,
                course.units,
                scheduled,
                remaining,
                courseStatus
            ]);
            addActionButtons(row, "courses", course.id);

            let choice = document.createElement("option");
            choice.value = course.id;
            if (remaining === 0) {
                choice.textContent = course.code + " - " + course.name + " (" + scheduled + "/" + course.units + " - Completed)";
                choice.disabled = true;
            } else {
                choice.textContent = course.code + " - " + course.name + " (" + scheduled + "/" + course.units + ")";
            }
            courseSelect.appendChild(choice);
        }

        let option = document.createElement("option");
        option.value = course.id;
        option.textContent = course.code + " - " + course.name + " (" + course.semester + ")";
        if (editingFacultyId !== null) {
            let editingPerson = findRecord(faculty, editingFacultyId);
            if (editingPerson !== null && editingPerson.courseIds.includes(course.id)) {
                option.selected = true;
            }
        }
        profileSelect.appendChild(option);
    }

    courseSelect.disabled = semesterCourseCount === 0;
    if (semesterCourseCount === 0) {
        courseSelect.innerHTML = '<option value="">No courses in this semester</option>';
    }

    let semesterScheduledCount = 0;
    for (let i = 0; i < allocations.length; i++) {
        let item = allocations[i];
        if (item.semester === semester) {
            let person = findRecord(faculty, item.facultyId);
            let course = findRecord(courses, item.courseId);
            let row = addRow(allocationTable, [
                person ? person.name : "Unknown",
                course ? course.code + " - " + course.name : "Unknown",
                item.day,
                item.start + " – " + item.end,
                1
            ]);
            addActionButtons(row, "allocations", item.id);
            semesterScheduledCount++;
        }
    }

    if (faculty.length === 0) {
        addEmptyRow(facultyTable, 9, "No faculty profiles registered yet.");
        addEmptyRow(reportTable, 7, "No faculty profiles registered yet.");
    }
    if (semesterCourseCount === 0) {
        addEmptyRow(courseTable, 8, "No courses registered for " + semester + ".");
    }
    if (semesterScheduledCount === 0) {
        addEmptyRow(allocationTable, 6, "No classes allocated for " + semester + " yet.");
    }

    let semReq = semesterRequirement(semester);
    let semPending = Math.max(0, semReq - semesterScheduledCount);
    let semStatus = "No courses";
    if (semesterCourseCount > 0) {
        semStatus = semPending === 0 ? "Complete" : "In progress (" + semPending + " pending)";
    }

    document.getElementById("totalFaculty").textContent = faculty.length;
    document.getElementById("totalCourses").textContent = semesterCourseCount;
    document.getElementById("totalAllocations").textContent = semesterScheduledCount + " / " + semReq;
    document.getElementById("totalWarnings").textContent = fullCount;
    document.getElementById("semesterDemand").textContent =
        semester + ": " + semReq + " of 54 weekly slots required · " + semesterScheduledCount + " scheduled · " + semPending + " pending (" + semStatus + ").";

    document.getElementById("reportSemester").textContent = "Semester Summary — " + semester;
    document.getElementById("reportRequired").textContent = semReq;
    document.getElementById("reportScheduled").textContent = semesterScheduledCount;
    document.getElementById("reportPending").textContent = semPending;
    document.getElementById("reportSemesterStatus").textContent = semStatus;
    document.getElementById("reportAssigned").textContent = totalAssignedAll;
    document.getElementById("reportCapacity").textContent = totalCapacityAll;

    courseSelect.value = previousCourse;
    if (courseSelect.selectedIndex < 0 || courseSelect.options[courseSelect.selectedIndex].disabled) {
        courseSelect.value = "";
    }
    updateFacultyChoices();
    let facultySelect = document.getElementById("selectFaculty");
    facultySelect.value = previousFaculty;
    if (facultySelect.selectedIndex < 0 || facultySelect.options[facultySelect.selectedIndex].disabled) {
        facultySelect.value = "";
    }
    updatePreview();
    renderTimetable();
    showMessage("allocationMessage", "", "success");
    saveData();
}

function renderTimetable() {
    let semester = currentSemester();
    let table = document.getElementById("timetable");
    table.innerHTML = "";
    for (let i = 0; i < times.length - 1; i++) {
        let values = [times[i] + " – " + times[i + 1]];
        for (let j = 0; j < days.length; j++) {
            let text = "Free";
            for (let k = 0; k < allocations.length; k++) {
                let item = allocations[k];
                if (item.semester === semester && item.day === days[j] && item.start === times[i]) {
                    let c = findRecord(courses, item.courseId);
                    let p = findRecord(faculty, item.facultyId);
                    text = (c ? c.code : "Course") + " / " + (p ? p.name : "Faculty");
                    break;
                }
            }
            values.push(text);
        }
        let row = addRow(table, values);
        for (let d = 1; d < values.length; d++) {
            if (values[d] !== "Free") {
                row.children[d].className = "scheduled-cell";
            } else {
                row.children[d].className = "free-cell";
            }
        }
    }
}

function navigate(event) {
    showSection(event.target.value);
}

let slotSelect = document.getElementById("slot");
for (let i = 0; i < times.length - 1; i++) {
    let option = document.createElement("option");
    option.value = i + 1;
    option.textContent = times[i] + " - " + times[i + 1];
    slotSelect.appendChild(option);
}

document.getElementById("loginForm").addEventListener("submit", login);
document.getElementById("logoutButton").addEventListener("click", logout);
document.getElementById("semester").addEventListener("change", changeSemester);
document.getElementById("facultyForm").addEventListener("submit", saveFaculty);
document.getElementById("cancelFacultyEditButton").addEventListener("click", cancelFacultyEdit);
document.getElementById("courseForm").addEventListener("submit", saveCourse);
document.getElementById("cancelCourseEditButton").addEventListener("click", cancelCourseEdit);
document.getElementById("allocationForm").addEventListener("submit", addAllocation);
document.getElementById("selectCourse").addEventListener("change", changeCourse);
document.getElementById("day").addEventListener("change", changeSelection);
document.getElementById("selectFaculty").addEventListener("change", changeSelection);

let navButtons = document.getElementsByClassName("nav-button");
for (let i = 0; i < navButtons.length; i++) {
    navButtons[i].addEventListener("click", navigate);
}
