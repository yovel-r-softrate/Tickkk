export type Users = User[];

export interface User {
  _id: string;
  email: string;
  name?: string;
  employeeId?: string;
  role?: string;
  companyId?: string;
}

