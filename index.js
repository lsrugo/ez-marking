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
  
  if (!user) {
    document.querySelector('#signin-message').textContent = 'Check your email for a sign in link';
    loading(false);
    return
  }
  
  e.target.classList.add('hidden');
  loadStudents(markStudent);
});

supabase.auth.onAuthStateChange((event, session) => {
  console.log(event, session)
  if (event === "SIGNED_IN") {
    console.log('signed in as', session.user.email);
    // hide sign in element if signed in
    document.querySelector('#signin').classList.add('hidden');
    loadStudents(markStudent);
  }
})

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

async function loadStudents(clickFunction) {
  loading(true);

  const { data, error } = await supabase.from('Students').select();

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

function addStudent(student, clickFunction) {
  let newNode = document.querySelector('#student').content.cloneNode(true);
  newNode.querySelector('div').id = student.id;
  newNode.querySelector('input').name = student.id;
  let name = student.name;
  if (student.hebrew) {
    // if hebrew name is set
    name = student.hebrew;
  }
  newNode.querySelector('h1').textContent = name;
  if (student.photo_url) {
    newNode.querySelector('img').src =
      'https://res.cloudinary.com/drdp6txb7/image/upload/v1629413004/students/' +
      student.photo_url +
      '.webp';
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

  // console.log(e.currentTarget.id); // for debugging
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
      student: item[0],
      attended: item[1],
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

  document.querySelector('#flex-container').replaceChildren();
  loadStudents(markStudent);
});

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

  document.querySelector('#history').classList.add('hidden');
  document.querySelector('#marking-instructions').classList.remove('hidden');

  // reload students with marking
  document.querySelector('#flex-container').replaceChildren();
  loadStudents(markStudent);
});

document.querySelector('#history-button').addEventListener('click', e => {
  e.currentTarget.classList.remove(...defaultMenuClasses);
  e.currentTarget.classList.add(...selectedMenuClasses);

  const homeBtn = document.querySelector('#home-button');
  homeBtn.classList.remove(...selectedMenuClasses);
  homeBtn.classList.add(...defaultMenuClasses);

  document.querySelector('#history').classList.remove('hidden');
  document.querySelector('#marking-instructions').classList.add('hidden');

  // clear students
  document.querySelector('#flex-container').replaceChildren();
});

document.querySelector('#history-date').addEventListener('change', async e => {
  loading(true);

  // clear time selector
  document.querySelector('#history-time-select').replaceChildren();

  // clear students
  document.querySelector('#flex-container').replaceChildren();

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
    document.querySelector('#no-data').classList.remove('hidden');
    loading(false);
    return;
  }

  document.querySelector('#no-data').classList.add('hidden');

  for (const timeObj of data) {
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

  const timeString = document.querySelector('#history-time-select').value;
  loadHistory(e.target.value, timeString);

  loading(false);
});

document.querySelector('#history-time-select').addEventListener('change', e => {
  document.querySelector('#flex-container').replaceChildren();
  const dateString = document.querySelector('#history-date').value;
  loadHistory(dateString, e.currentTarget.value);
});

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
  let imagesMap = {};
  let imagePromises = [];
  const csv = formData.get('csv');

  images.forEach(img => {
    const p = uploadImage(img)
      .then(res => res.json())
      .then(res => {
        console.log(res);
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
      // console.log(r);

      if (r.errors.length > 0) {
        r.errors.forEach(e => console.error(e.message + ' on row ' + e.row));
        loading(false);
        alert('import failed. check your csv file for errors');
        return;
      }

      const students = r.data.map(v => ({
        name: v.First + ' ' + v.Last,
        hebrew: v['Hebrew first'] + ' ' + v['Hebrew last'],
        photo_url: imagesMap[v['File name']] || null
      }));

      // console.log(students);

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

function uploadImage(image) {
  console.log('upload started');
  const formData = new FormData();
  formData.append('upload_preset', 'students');
  formData.append('file', image);

  return fetch('https://api.cloudinary.com/v1_1/drdp6txb7/image/upload', {
    method: 'POST',
    body: formData
  });
}

function loading(show) {
  if (show) {
    document.querySelector('#loading').classList.remove('hidden');
    document.querySelector('main').classList.add('hidden');
  } else {
    document.querySelector('#loading').classList.add('hidden');
    document.querySelector('main').classList.remove('hidden');
  }
}
