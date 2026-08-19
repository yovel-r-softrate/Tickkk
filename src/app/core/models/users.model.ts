export interface Users {
  status: string;
  message: string;
  data: UsersData;
}

export interface UsersData {
  users: UserItem[];
  totalUsers: number;
  totalPages: number;
  currentPage: number;
}

export interface UserItem {
  _id: string;
  name: string;
  email: string;
  employeeId: string;
  role: string;
  department: string;
  status: string;
  phone: string;
  onboardingDate: string | null;
  type: 'Employee' | 'Intern';
  __v?: number;
}
