const axios = require('axios');

async function getHrmsUsers(companyId, token) {
  try {
    const employeeUrl = `${process.env.HRMS_API_URL}/api/employee/all/active`;
    const internUrl = `${process.env.HRMS_API_URL}/api/intern/all/active`;
    
    const headers = {
      'Authorization': token,
      'x-company-code': companyId
    };

    // Fetch both employees and interns concurrently
    const [employeeResponse, internResponse] = await Promise.allSettled([
      axios.get(employeeUrl, { headers }),
      axios.get(internUrl, { headers })
    ]);

    let employees = [];
    if (employeeResponse.status === 'fulfilled') {
      const data = employeeResponse.value.data;
      employees = Array.isArray(data) ? data : (data && data.data ? data.data : []);
    } else {
      console.error("Failed to fetch employees from HRMS:", employeeResponse.reason.message);
    }

    let interns = [];
    if (internResponse.status === 'fulfilled') {
      const data = internResponse.value.data;
      interns = Array.isArray(data) ? data : (data && data.data ? data.data : []);
    } else {
      console.error("Failed to fetch interns from HRMS:", internResponse.reason.message);
    }

    // Map employees to generic structure
    const mappedEmployees = employees.map(emp => ({
      _id: emp._id,
      name: emp.fullName || emp.name || emp.email,
      email: emp.email,
      employeeId: emp.employeeId || emp.EmployeeId || 'EMP',
      role: emp.role || 'N/A',
      department: emp.department || 'N/A',
      status: emp.status || 'Active',
      phone: emp.phone || 'N/A',
      onboardingDate: emp.onboardingDate || null,
      type: 'Employee'
    }));

    // Map interns to generic structure
    const mappedInterns = interns.map(intern => ({
      _id: intern._id,
      name: intern.fullName || intern.name || intern.email || 'Intern',
      email: intern.email,
      employeeId: intern.internid || intern.InternId || 'INT',
      role: intern.role || 'N/A',
      department: intern.department || 'N/A',
      status: intern.status || 'Active',
      phone: intern.contact || 'N/A',
      onboardingDate: intern.onboardingDate || null,
      type: 'Intern'
    }));

    // Return combined lists
    return [...mappedEmployees, ...mappedInterns];
  } catch (error) {
    console.error("Error fetching users from HRMS:", error.message);
    return [];
  }
}

module.exports = { getHrmsUsers };
