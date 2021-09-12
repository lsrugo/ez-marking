// for csv import
import papaparse from 'papaparse';

const SUPABASE_URL = 'https://nbdlywnhcnecjobtgncc.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYyNjczNDk5MiwiZXhwIjoxOTQyMzEwOTkyfQ.yq0qmSFcQGkzMVJk_oGV1tyfywlO-nMzdvxRAQ7WJpk';
// Initialize the JS client
import { createClient } from '@supabase/supabase-js';
const supabase = createClient([SUPABASE_URL], [SUPABASE_ANON_KEY]);

document.querySelector('#signin').addEventListener('submit', async e => {
  e.preventDefault();

  loading(true);

  const { user, error } = await supabase.auth.signIn({
    email: e.target.querySelector('input[type="email"]').value,
    password: e.target.querySelector('input[type="password"]').value
  });
  
  if (error) {
    document.querySelector('#loading').classList.add('hidden');
    document.querySelector('#signin-message').textContent = error.message;
    console.error(error);
    return;
  }
  
  // magic login link was sent if no password was provided
  if (!user) {
    document.querySelector('#signin-message').textContent = 'Check your email for a sign in link';
    loading(false);
    return
  }
});

supabase.auth.onAuthStateChange((event, session) => {
  console.log(event, session)
  if (event === "SIGNED_IN") {
    console.log('signed in as', session.user.email);
    // hide sign in element if signed in
    document.querySelector('#signin').classList.add('hidden');
    
    console.log('loading students')
    loadStudents(markStudent);
  }
})

// hide loading once JS is ready and if no user is signed in
if (!supabase.auth.user()) {
  console.log('not signed in');
  document.querySelector('#loading').classList.add('hidden');
  // sign in screen is already visible by default
}

document.querySelector('#signOut').addEventListener('click', async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error(error);
    return;
  }
  console.log('signed out');
  // reload window to show login screen
  location.reload();
});

/**
 * Load students and create new element for each one
 * @param {function} clickFunction - click handler for each student card element
 */
async function loadStudents(clickFunction) {
  // check if already loaded
  const container = document.querySelector('#flex-container')
  console.log('number of loaded students', container.childElementCount)
  if (container.childElementCount > 0) {
    // don't load students if they are already present
    console.log('students already loaded')
    return
  }

  loading(true);

  // select all students ordered by hebrew last name
  const { data, error } = await supabase
    .from('Students')
    .select()
    .order('h_last_name', { ascending: true });

  if (error) {
    loading(false);
    console.error(error);
    return;
  }

  for (let student of data) {
    addStudent(student, clickFunction);
  }

  loading(false);
}

/**
 * create a new card element from student object and add onto page
 * @param {object} student - student object
 * @param {number} student.id - database id
 * @param {string} student.name - full english name
 * @param {string} student.hebrew - full hebrew name
 * @param {string} student.photo_url - url for photo in cloudinary
 * @param {function} clickFunction - click handler for card element
 */
function addStudent(student, clickFunction) {
  // create new card element from student template node
  let newNode = document.querySelector('#student').content.cloneNode(true);
  newNode.querySelector('div').id = student.id;
  newNode.querySelector('input').name = student.id;
  let name = student.name;
  if (student.hebrew) {
    // if hebrew name is set use it instead
    name = student.hebrew;
  }
  newNode.querySelector('h1').textContent = name;
  if (student.photo_url) {
    newNode.querySelector('img').src =
      'https://res.cloudinary.com/drdp6txb7/image/upload/v1629413004/students/' +
      student.photo_url;
  } else {
    newNode.querySelector('img').remove();
  }

  if (clickFunction) {
    // add event listener to student card
    newNode.querySelector('div').addEventListener('click', clickFunction);
  }
  // add card to page
  document.querySelector('#flex-container').appendChild(newNode);

  return document.getElementById(student.id);
}

// event handler to mark student as present and hide card
function markStudent(e) {
  e.currentTarget.classList.add('opacity-0');
  e.currentTarget.addEventListener('transitionend', e => {
    e.currentTarget.classList.add('hidden');
  });
  e.currentTarget.querySelector('input').value = true;
}

document.querySelector('#students-form').addEventListener('submit', async e => {
  e.preventDefault();

  loading(true);

  let today = new Date();

  let res = await supabase.from('times').insert([
    {
      date: today.toLocaleDateString('sv'),
      time: today.toLocaleTimeString('sv')
    }
  ]);

  if (res.error) {
    console.error(res.error);
    return;
  }

  const timeId = res.data[0].id;

  let data = [];
  let formData = new FormData(e.target);
  for (let item of formData) {
    data.push({
      student: item[0], // student id
      attended: item[1], // boolean whether they were present
      time: timeId
    });
  }

  res = await supabase.from('Attendance').insert(data);

  loading(false);

  if (res.error) {
    alert('submit failed');
    console.error(res.error);
  } else {
    alert('submit success!');
  }

  // clear screen and reload all students
  document.querySelector('#flex-container').replaceChildren('');
  loadStudents(markStudent);
});

// highlight the selected menu item when it is clicked
const defaultMenuClasses = [
  'text-gray-300',
  'hover:bg-gray-700',
  'hover:text-white'
];
const selectedMenuClasses = ['bg-gray-900', 'text-white'];
document.querySelector('#home-button').addEventListener('click', e => {
  e.currentTarget.classList.remove(...defaultMenuClasses);
  e.currentTarget.classList.add(...selectedMenuClasses);

  const historyBtn = document.querySelector('#history-button');
  historyBtn.classList.remove(...selectedMenuClasses);
  historyBtn.classList.add(...defaultMenuClasses);

  document.querySelector('#no-data').classList.add('hidden');
  // clear date and time selectors
  document.querySelector('#history-date').value = '';
  document.querySelector('#history-time-select').value = '';
  // hide history menu and show marking info
  document.querySelector('#history').classList.add('hidden');
  document.querySelector('#marking-instructions').classList.remove('hidden');

  // reload students with marking
  document.querySelector('#flex-container').replaceChildren('');
  loadStudents(markStudent);
});

document.querySelector('#history-button').addEventListener('click', e => {
  e.currentTarget.classList.remove(...defaultMenuClasses);
  e.currentTarget.classList.add(...selectedMenuClasses);

  const homeBtn = document.querySelector('#home-button');
  homeBtn.classList.remove(...selectedMenuClasses);
  homeBtn.classList.add(...defaultMenuClasses);
  // hide marking info and show history menu
  document.querySelector('#history').classList.remove('hidden');
  document.querySelector('#marking-instructions').classList.add('hidden');

  // clear students
  document.querySelector('#flex-container').replaceChildren('');
});

document.querySelector('#history-date').addEventListener('change', async e => {
  loading(true);

  // clear time selector
  document.querySelector('#history-time-select').replaceChildren('');

  // clear students
  document.querySelector('#flex-container').replaceChildren('');

  // if clear button was pressed on date picker
  if (!e.currentTarget.value) {
    return;
  }

  const { data, error } = await supabase
    .from('times')
    .select('time')
    .eq('date', e.currentTarget.value);

  if (error) {
    console.error(error);
    return;
  }

  if (data.length === 0) {
    // show no data message
    document.querySelector('#no-data').classList.remove('hidden');
    loading(false);
    return;
  }
  // hide no data message if there is data
  document.querySelector('#no-data').classList.add('hidden');

  for (const timeObj of data) {
    // add time options to dropdown
    const newEl = document.createElement('option');
    newEl.value = timeObj.time;

    // format time string
    const timeArray = timeObj.time.split(':');
    let hour = parseInt(timeArray[0]);
    let timeString;
    // if time is PM
    if (hour > 12) {
      hour -= 12;
      timeString = `${hour}:${timeArray[1]} PM`;
    } else if (hour === 12) {
      // if hour is midday
      timeString = `${hour}:${timeArray[1]} PM`;
    } else if (hour === 0) {
      // if hour is midnight
      timeString = `12:${timeArray[1]} AM`;
    } else {
      timeString = `${hour}:${timeArray[1]} AM`;
    }

    newEl.appendChild(document.createTextNode(timeString));
    document.querySelector('#history-time-select').appendChild(newEl);
  }
  // load history for selected date and first time
  const timeString = document.querySelector('#history-time-select').value;
  loadHistory(e.target.value, timeString);

  loading(false);
});

document.querySelector('#history-time-select').addEventListener('change', e => {
  // clear screen and load history for selected time
  document.querySelector('#flex-container').replaceChildren('');
  const dateString = document.querySelector('#history-date').value;
  loadHistory(dateString, e.currentTarget.value);
});

/**
 * Load attendance history for specific date and time
 * @param {string} dateString
 * @param {string} timeString
 */
async function loadHistory(dateString, timeString) {
  loading(true);

  let { data, error } = await supabase
    .from('times')
    .select('id')
    .eq('date', dateString)
    .eq('time', timeString);

  if (error) {
    console.error(error);
    return;
  }

  ({ data, error } = await supabase
    .from('Attendance')
    .select(
      `student (
        id,
        name,
        hebrew,
        photo_url
      ),
      attended`
    )
    .eq('time', data[0].id)
    .eq('attended', false)
    .order('student', { ascending: true }));

  // console.log(data) // for debugging

  if (error) {
    console.error(error);
    return;
  }

  // TODO change message to everyone came on time
  if (data.length === 0) {
    document.querySelector('#no-data').classList.remove('hidden');
    loading(false);
    return;
  }

  document.querySelector('#no-data').classList.add('hidden');

  for (let item of data) {
    const studentEl = addStudent(item.student);
    const div = studentEl.querySelector('div');
    // only absent students are being loaded
    div.appendChild(
      document.querySelector('#absent-icon').content.cloneNode(true)
    );
  }

  loading(false);
}

document.querySelector('#import').addEventListener('submit', async e => {
  console.log('import started');

  loading(true);

  e.preventDefault();

  const formData = new FormData(e.target);
  const images = formData.getAll('images');
  let imagesMap = {}; // map filename to cloudinary id
  let imagePromises = []; // promises for cloudinary uploads
  const csv = formData.get('csv');

  images.forEach(img => {
    const p = uploadImage(img)
      .then(res => res.json())
      .then(res => {
        // console.log(res); // for debugging
        imagesMap[img.name] = res.public_id.split('/')[1];
      });

    imagePromises.push(p);
  });

  await Promise.all(imagePromises).catch(e => console.error(e));
  console.log('all images uploaded', imagesMap, Object.keys(imagesMap).length);

  papaparse.parse(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => {
      // rename headers
      if (h === "Student's Legal Name") {
        return 'First';
      } else if (h === 'LASTH') {
        return 'Hebrew last';
      } else if (h === 'FIRST') {
        return 'Hebrew first';
      } else if (h.includes('Upload a current picture')) {
        return 'File name';
      }
      return h;
    },
    complete: async r => {
      if (r.errors.length > 0) {
        r.errors.forEach(e => console.error(e.message + ' on row ' + e.row));
        loading(false);
        alert('import failed. check your csv file for errors');
        return;
      }

      // transform data for upload to database
      const students = r.data.map(v => ({
        name: v.First + ' ' + v.Last,
        hebrew: v['Hebrew first'] + ' ' + v['Hebrew last'],
        photo_url: imagesMap[v['File name']] || null
      }));

      const { error } = await supabase
        .from('Students')
        .insert(students, { returning: 'minimal' });

      if (error) {
        loading(false);
        console.error(error);
        alert('import failed');
        return;
      }

      loading(false);
      alert('import success. students have been added');
    },
    error: e => console.error(e)
  });
});

/**
 * Upload image to cloudinary
 * @param {File} image
 * @returns {Promise<Response>}
 */
function uploadImage(image) {
  console.log('upload started');
  const formData = new FormData();
  // the students upload preset resizes to 68x68 and crops to detected face
  formData.append('upload_preset', 'students');
  formData.append('file', image);

  return fetch('https://api.cloudinary.com/v1_1/drdp6txb7/image/upload', {
    method: 'POST',
    body: formData
  });
}

/**
 * Show/hide loading indicator
 * @param {boolean} show - show loading indicator
 */
function loading(show) {
  if (show) {
    document.querySelector('#loading').classList.remove('hidden');
    document.querySelector('main').classList.add('hidden');
  } else {
    document.querySelector('#loading').classList.add('hidden');
    document.querySelector('main').classList.remove('hidden');
  }
}
