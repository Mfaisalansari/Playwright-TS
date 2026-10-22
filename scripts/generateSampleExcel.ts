/**
 * Generates test-data/testdata.xlsx with sample sheets.
 * Run: npm run generate:testdata
 */
import { ExcelReader } from '../src/utils/ExcelReader';

(async () => {
  const file = 'testdata.xlsx';
  await ExcelReader.writeSheet(file, 'Login', [
    { TestCaseID: 'XL_LOGIN_01', Description: 'Valid login', Username: 'tomsmith', Password: 'SuperSecretPassword!', Expected: 'You logged into a secure area!', Execute: 'Y' },
    { TestCaseID: 'XL_LOGIN_02', Description: 'Wrong password', Username: 'tomsmith', Password: 'nope', Expected: 'Your password is invalid!', Execute: 'Y' },
    { TestCaseID: 'XL_LOGIN_03', Description: 'Not executed', Username: 'x', Password: 'y', Expected: '-', Execute: 'N' },
  ]);
  await ExcelReader.writeSheet(file, 'TestData', [
    { TestCaseID: 'TC_001', FirstName: '{{random.firstName}}', Email: '{{random.email}}', StartDate: '{{today}}', EndDate: '{{date:+30d}}', Dropdown: 'Option 2' },
    { TestCaseID: 'TC_002', FirstName: 'Faisal', Email: 'qa@example.com', StartDate: '01/01/2027', EndDate: '{{date:+1y:yyyy-MM-dd}}', Dropdown: 'Option 1' },
  ]);
  await ExcelReader.writeSheet(file, 'Registration', [
    { TestCaseID: 'XL_REG_01', FirstName: 'Aisha', LastName: 'Khan', Email: 'aisha.xl@demo.test', Country: 'United Arab Emirates', Skills: 'Java|SQL', LineOfBusiness: 'Casualty', Execute: 'Y' },
    { TestCaseID: 'XL_REG_02', FirstName: '{{random.firstName}}', LastName: 'Patel', Email: '{{random.email}}', Country: 'India', Skills: 'Python', LineOfBusiness: 'Property', Execute: 'Y' },
    { TestCaseID: 'XL_REG_03', FirstName: 'Skip', LastName: 'Me', Email: 'skip@demo.test', Country: 'India', Skills: 'SQL', LineOfBusiness: 'Motor', Execute: 'N' },
  ]);
  console.log('Created test-data/testdata.xlsx');
})();
