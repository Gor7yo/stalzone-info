export interface IQueryParamsClan {
  region?: string;
  clanId?: string;
  offset?: string;
  limit?: string;
}

export interface IClanInfo {
  id: string;
  name: string;
  tag: string;
  level: number;
  levelPoint: number;
  registrationTime: Date;
  alliance?: string;
  description: string;
  leader: string;
  memberCount: number;
  region?: string;
}

export interface IClansList {
  totalClans: number;
  data: IClanInfo[];
}

export interface IRegionData {
  [region: string]: IClansList;
}
