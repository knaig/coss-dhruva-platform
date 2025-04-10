db = db.getSiblingDB('admin');
db.createUser({
  user: 'dhruvaadmin',
  pwd: 'dhruva123',
  roles: [{ role: 'root', db: 'admin' }]
}); 