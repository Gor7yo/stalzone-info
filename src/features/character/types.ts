import { IClanInfo } from "../clans/types";

export interface IQueryParamsCharacter {
  region: string;
  username: string;
}

export interface ICharacterProfile {
  username: string;
  uuid: string;
  status: string;
  alliance: string;
  lastLogin: Date;
  displayedAchievements: string[];
  clan: ICharacterClanInfo;
  stats: {
    id: string;
    type: "INTEGER" | "DECIMAL" | "DATE" | "DURATION";
    value: {
      [key: string]: any;
    };
  }[];
}

export interface ICharacterClanInfo {
  info: IClanInfo;
  member: {
    name: string;
    rank:
      | "RECRUIT"
      | "COMMONER"
      | "SOLDIER"
      | "SERGEANT"
      | "OFFICER"
      | "COLONE"
      | "LLEADER";
    joinTime: Date;
  };
}
