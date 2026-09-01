/* 正式上架時將 mode 改為 firebase-email-link，並在後端安全規則再次驗證角色。 */
window.MATH_AUTH_CONFIG={
 mode:'local-preview',
 allowedDomains:['lmjh.tp.edu.tw'],
 studentEmailRule:{domain:'lmjh.tp.edu.tw',years:{'113':'9','114':'8','115':'7'},classMin:1,classMax:20,seatMin:1,seatMax:40},
 developerEmails:['a0975895067@gmail.com'],
 firebase:{apiKey:'',authDomain:'',projectId:'',appId:''},
 reporting:{endpoint:'',teacherDashboard:'teacher-dashboard.html'},
 storageKeys:{teachers:'mathMissionTeacherApprovalsV1',classes:'mathMissionClassesV1',assignments:'mathMissionAssignmentsV1',applications:'mathMissionTeacherApplicationsV1'}
};
