-- instagram_whitelist에 region 컬럼 추가
alter table instagram_whitelist
  add column if not exists region text not null default 'en'
  check (region in ('ko', 'en'));

-- 기존 국내 계정 region 업데이트
update instagram_whitelist set region = 'ko'
where handle in ('@designcompass', '@designspectrum_official', '@ordinarypeople.info', '@baene.studio');
