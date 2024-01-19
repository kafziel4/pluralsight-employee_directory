import createPrompt from 'prompt-sync';
import { getAllEmployees, insertEmployee } from './database.js';
import { getCurrencyConversionData, getSalary } from './currency.js';

let employees = [];
let currencyData;
const prompt = createPrompt();

const logEmployee = (employee) => {
  Object.entries(employee).forEach((entry) => {
    if (entry[0] !== 'salaryUSD' || entry[0] !== 'localCurrency') {
      console.log(`${entry[0]}: ${entry[1]}`);
    }
  });

  console.log(`Salary USD: ${getSalary(employee.salaryUSD, 'USD', currencyData)}`);
  console.log(
    `Local Salary: ${getSalary(employee.salaryUSD, employee.localCurrency, currencyData)}`,
  );
};

function getInput(promptText, validator, transformer) {
  const value = prompt(promptText);
  if (validator && !validator(value)) {
    console.error('--Invalid input');
    return getInput(promptText, validator, transformer);
  }

  if (transformer) {
    return transformer(value);
  }

  return value;
}

const getNextEmployeeId = () => {
  if (employees.length === 0) {
    return 1;
  }

  const maxId = Math.max(...employees.map((e) => e.id));
  return maxId + 1;
};

const isCurrencyCodeValid = (code) => {
  const currencyCodes = Object.keys(currencyData.rates);
  return currencyCodes.indexOf(code) > -1;
};

const isStringInputValid = (input) => !!input;

const isBooleanInputValid = (input) => input === 'yes' || input === 'no';

const isIntegerValid = (min, max) => (input) => {
  const numValue = Number(input);
  if (!Number.isInteger(numValue) || numValue < min || numValue > max) {
    return false;
  }

  return true;
};

function listEmployees() {
  console.log('Employee List ------------');
  console.log('');

  employees.forEach((e) => {
    logEmployee(e);
    prompt('Press enter to continue...');
  });
  console.log('Employee list completed');
}

async function addEmployee() {
  console.log('Add Employee ------------');
  console.log('');

  const employee = {};

  employee.id = getNextEmployeeId();
  employee.firstName = getInput('First Name: ', isStringInputValid);
  employee.lastName = getInput('Last Name: ', isStringInputValid);
  employee.email = getInput('Email: ', isStringInputValid);
  const startDateYear = getInput('Employee Start Year (1990-2024): ', isIntegerValid(1990, 2023));
  const startDateMonth = getInput('Employee Start Date Month (1-12): ', isIntegerValid(1, 12));
  const startDateDay = getInput('Employee Start Date Day (1-31): ', isIntegerValid(1, 31));
  employee.startDate = new Date(startDateYear, startDateMonth - 1, startDateDay);
  employee.isActive = getInput(
    'Is employee active (yes or no): ',
    isBooleanInputValid,
    (i) => i === 'yes',
  );
  employee.salaryUSD = getInput('Annual salary in USD: ', isIntegerValid(10000, 1000000));
  employee.localCurrency = getInput('Local currency (3 letter code): ', isCurrencyCodeValid);

  await insertEmployee(employee);
}

function searchById() {
  const id = getInput('Employee ID: ', null, Number);
  const result = employees.find((e) => e.id === id);
  if (result) {
    console.log('');
    logEmployee(result);
  } else {
    console.log('No results...');
  }
}

function searchByName() {
  const firstNameSearch = getInput('First Name: ').toLowerCase();
  const lastNameSearch = getInput('Last Name: ').toLowerCase();
  const results = employees.filter((e) => {
    if (firstNameSearch && !e.firstName.toLowerCase().includes(firstNameSearch)) {
      return false;
    }
    if (lastNameSearch && !e.lastName.toLowerCase().includes(lastNameSearch)) {
      return false;
    }

    return true;
  });

  results.forEach((e, index) => {
    console.log('');
    console.log(`Search Result ${index + 1} ------------`);
    logEmployee(e);
  });
}

const main = async () => {
  const command = process.argv[2].toLowerCase();

  switch (command) {
    case 'list':
      listEmployees();
      break;
    case 'add':
      await addEmployee();
      break;
    case 'search-by-id':
      searchById();
      break;
    case 'search-by-name':
      searchByName();
      break;
    default:
      console.log('Unsupported command. Exiting...');
      process.exit(1);
  }
};

Promise.all([getAllEmployees(), getCurrencyConversionData()])
  .then((results) => {
    [employees, currencyData] = results;
    return main();
  })
  .catch((err) => {
    console.error('Cannot complete startup');
    throw err;
  });
