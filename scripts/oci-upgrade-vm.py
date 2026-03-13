import oci
import time
from datetime import datetime

# ── 설정 (여기만 수정하세요) ────────────────────────────────────────
CONFIG_FILE    = "C:/Users/thisi/.oci/config"
INSTANCE_OCID  = "ocid1.instance.oc1.ap-chuncheon-1.an4w4ljr67z7b6ycidyvptdulzzc7vbgtoai4wtehayn26uesk2k5bgf4poa"
TARGET_OCPU    = 4
TARGET_MEMORY  = 24          # GB
RETRY_INTERVAL = 60          # 초
# ────────────────────────────────────────────────────────────────────

# 재시도 없이 즉시 종료해야 하는 HTTP 상태 코드
FATAL_STATUS_CODES = [400, 401, 403, 404]


def log(attempt, msg):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[시도 {attempt}] {now} - {msg}", flush=True)


def main():
    if not INSTANCE_OCID:
        print("❌ INSTANCE_OCID가 비어 있습니다. 스크립트 상단에 인스턴스 OCID를 입력하세요.")
        return

    print("=" * 60)
    print("  Oracle VM 자동 업그레이드 스크립트")
    print(f"  목표: {TARGET_OCPU} OCPU / {TARGET_MEMORY} GB")
    print("=" * 60)

    # OCI 설정 및 클라이언트 초기화
    try:
        config = oci.config.from_file(CONFIG_FILE)
        compute = oci.core.ComputeClient(config)
    except Exception as e:
        print(f"❌ OCI 초기화 실패: {e}")
        print("config 파일 경로와 pem 파일 경로를 확인하세요.")
        return

    # 실행 전 현재 인스턴스 상태 확인
    try:
        instance = compute.get_instance(INSTANCE_OCID).data
        print(f"\n현재 상태:  {instance.lifecycle_state}")
        print(f"현재 스펙:  OCPU={instance.shape_config.ocpus}, Memory={instance.shape_config.memory_in_gbs}GB\n")
    except oci.exceptions.ServiceError as e:
        print(f"❌ 인스턴스 조회 실패 (HTTP {e.status}): {e.message}")
        return

    # 이미 목표 스펙인지 확인
    if (instance.shape_config.ocpus == TARGET_OCPU and
            instance.shape_config.memory_in_gbs == TARGET_MEMORY):
        print("✅ 이미 목표 스펙입니다. 업그레이드가 필요하지 않습니다.")
        return

    # 인스턴스 상태 확인
    if instance.lifecycle_state not in ["RUNNING", "STOPPED"]:
        print(f"❌ 인스턴스 상태가 '{instance.lifecycle_state}'입니다.")
        print("RUNNING 또는 STOPPED 상태일 때만 업그레이드할 수 있습니다.")
        return

    print("🔄 업그레이드 시도를 시작합니다. 중단하려면 Ctrl+C를 누르세요.")
    print(f"  재시도 간격: {RETRY_INTERVAL}초\n")

    attempt = 0
    while True:
        attempt += 1
        try:
            response = compute.update_instance(
                instance_id=INSTANCE_OCID,
                update_instance_details=oci.core.models.UpdateInstanceDetails(
                    shape_config=oci.core.models.UpdateInstanceShapeConfigDetails(
                        ocpus=TARGET_OCPU,
                        memory_in_gbs=TARGET_MEMORY
                    )
                )
            )

            print(f"\n🎉 업그레이드 요청 성공! (HTTP {response.status})")
            print("⚠️  VM이 재부팅됩니다. RUNNING 상태 복귀를 기다립니다...\n")

            # VM 재부팅 후 RUNNING 상태 복귀 확인 (최대 20분 대기)
            time.sleep(30)  # 재부팅 시작 대기
            for check in range(20):
                try:
                    inst = compute.get_instance(INSTANCE_OCID).data
                    print(f"  [{check + 1}/20] 인스턴스 상태: {inst.lifecycle_state}")
                    if inst.lifecycle_state == "RUNNING":
                        print(f"\n✅ 업그레이드 완료 및 RUNNING 복귀 확인!")
                        print(f"  OCPU:   {inst.shape_config.ocpus}")
                        print(f"  Memory: {inst.shape_config.memory_in_gbs} GB")
                        print("\n📋 다음 작업:")
                        print("  1. SSH로 VM 접속")
                        print("  2. pm2 list 실행 → maptamin-worker online 확인")
                        return
                except Exception:
                    print(f"  [{check + 1}/20] 상태 조회 중 오류 (재부팅 중일 수 있음)")
                time.sleep(60)

            print("⚠️  20분 내 RUNNING 복귀를 확인하지 못했습니다.")
            print("오라클 콘솔에서 직접 확인하세요.")
            return

        except oci.exceptions.ServiceError as e:
            if e.status in FATAL_STATUS_CODES:
                print(f"\n❌ 치명적 오류 (HTTP {e.status}): {e.message}")
                print("OCID, API Key, config 파일 설정을 확인하고 다시 실행하세요.")
                return
            # Out of host capacity (HTTP 500) 등 → 재시도
            log(attempt, f"실패 (HTTP {e.status}) - {e.message}")
            log(attempt, f"{RETRY_INTERVAL}초 후 재시도...")
            time.sleep(RETRY_INTERVAL)

        except KeyboardInterrupt:
            print("\n\n⛔ 사용자가 중단했습니다.")
            return

        except Exception as e:
            log(attempt, f"예상치 못한 오류: {e}")
            log(attempt, f"{RETRY_INTERVAL}초 후 재시도...")
            time.sleep(RETRY_INTERVAL)


if __name__ == "__main__":
    main()
