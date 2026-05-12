-- content_types (5개)
insert into content_types (name, description, target_ratio, is_active, sort_order) values
('실무 디자인 인사이트', '중소기업·소기업·스타트업 실무자가 브랜드·웹사이트·제안서·상세페이지·SNS 콘텐츠를 만들 때 판단 기준으로 사용할 수 있는 디자인 콘텐츠', 55, true, 1),
('웹사이트 경험과 모션', '웹사이트를 브랜드 경험으로 보이게 만드는 요소: 첫 화면 구성, 스크롤 흐름, CTA 배치, 인터랙션, 마이크로 모션', 25, true, 2),
('AI 비주얼 트렌드와 활용', 'AI 이미지·영상·디자인 툴의 변화를 중소기업·스타트업 실무자 관점에서 정리하는 콘텐츠', 10, true, 3),
('디자인 의뢰 전 가이드', '디자인 외주를 맡기기 전 준비해야 할 내용, 예산이 달라지는 이유, 좋은 결과물을 위한 기준', 5, true, 4),
('바이너스 관점과 작업 해설', '바이너스프레드의 디자인 철학과 실제 작업 해석: 왜 이 컬러·레이아웃·모션을 선택했는지', 5, true, 5);

-- instagram_whitelist (10개)
insert into instagram_whitelist (handle, description, is_active) values
('@designcompass', '디자인 나침반. UX·UI·BX 매체', true),
('@designspectrum_official', '국내 최대 디자인 커뮤니티', true),
('@ordinarypeople.info', 'Ordinary People. 서울·뉴욕 기반 브랜딩 스튜디오', true),
('@baene.studio', '국내 디자인 스튜디오', true),
('@uxgoodies', 'Ioana Teleanu. UX 카드뉴스 매체 220K', true),
('@welovewebdesign', 'Web Design Inspiration 큐레이션 647K', true),
('@welovebranding', '브랜딩 작품 큐레이션', true),
('@weloveillustration', '일러스트 큐레이션', true),
('@uidesignpatterns', 'UI/UX 영감·밈 422K', true),
('@iamnotmypixels', 'Yael Levey. 런던 UX 디자인 리드', true);

-- instagram_hashtags (16개)
insert into instagram_hashtags (hashtag, language, is_active) values
('#UI디자인', 'ko', true),
('#UX디자인', 'ko', true),
('#웹디자인', 'ko', true),
('#앱디자인', 'ko', true),
('#브랜드디자인', 'ko', true),
('#로고디자인', 'ko', true),
('#디자인스튜디오', 'ko', true),
('#디자인트렌드', 'ko', true),
('#UIUXdesign', 'en', true),
('#productdesign', 'en', true),
('#webdesign', 'en', true),
('#mobileui', 'en', true),
('#brandidentity', 'en', true),
('#designinspiration', 'en', true),
('#designsystem', 'en', true),
('#figmadesign', 'en', true);

-- collection_filters (기본값)
insert into collection_filters (filter_key, filter_value, label) values
('min_likes', '500', '최소 좋아요 수'),
('min_followers', '1000', '최소 팔로워 수'),
('whitelist_ratio', '70', '화이트리스트 비율 (%)'),
('ad_keywords', '광고,협찬,할인,이벤트,프로모션,할인코드', '광고 제외 키워드 (쉼표 구분)');
