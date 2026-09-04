ALTER TABLE access_applications ADD COLUMN pending_password_salt TEXT;
ALTER TABLE access_applications ADD COLUMN pending_password_digest TEXT;
